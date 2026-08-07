import { NextResponse } from 'next/server';
import type { Diet } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { MAX_GUEST_NOTE_LENGTH } from '@/app/handfasting-simple/guest-constellation/partyLimits';

// Partial update of host-editable guest fields from admin table cell edits.

const DIET_ALLOWLIST = new Set<string>(['omnivore', 'vegetarian', 'vegan', 'none']);

type GuestPatch = {
  name?: string;
  diet?: Diet;
  rsvp?: boolean | null;
  isChildUnder2?: boolean;
  needsHighChair?: boolean;
  note?: string | null;
  registeredById?: string | null;
};

const buildGuestPatch = (body: Record<string, unknown>): GuestPatch => {
  const patch: GuestPatch = {};
  if (typeof body.name === 'string' && body.name.trim() !== '') patch.name = body.name.trim();
  if (typeof body.diet === 'string' && DIET_ALLOWLIST.has(body.diet)) patch.diet = body.diet as Diet;
  if ('rsvp' in body && (body.rsvp === true || body.rsvp === false || body.rsvp === null)) {
    patch.rsvp = body.rsvp;
  }
  if (typeof body.isChildUnder2 === 'boolean') patch.isChildUnder2 = body.isChildUnder2;
  if (typeof body.needsHighChair === 'boolean') patch.needsHighChair = body.needsHighChair;
  if (body.note === null) patch.note = null;
  if (typeof body.note === 'string') {
    const trimmedNote = body.note.trim().slice(0, MAX_GUEST_NOTE_LENGTH);
    patch.note = trimmedNote === '' ? null : trimmedNote;
  }
  if ('registeredById' in body) {
    patch.registeredById =
      body.registeredById === null || body.registeredById === ''
        ? null
        : typeof body.registeredById === 'string' && body.registeredById.trim() !== ''
          ? body.registeredById.trim()
          : undefined;
  }
  return patch;
};

const resolveGuestAdminFields = async (guest: {
  id: string;
  registeredById: string | null;
  inviteeId: string | null;
  rsvp: boolean | null;
  note: string | null;
}) => {
  const [registeredBy, invitee] = await Promise.all([
    guest.registeredById
      ? prisma.guest.findUnique({ where: { id: guest.registeredById }, select: { name: true } })
      : Promise.resolve(null),
    guest.inviteeId
      ? prisma.invitee.findUnique({ where: { id: guest.inviteeId }, select: { name: true } })
      : Promise.resolve(null),
  ]);
  return {
    registeredById: guest.registeredById,
    registeredByName: registeredBy?.name ?? null,
    inviteeId: guest.inviteeId,
    inviteeName: invitee?.name ?? null,
    rsvp: guest.rsvp,
    note: guest.note,
  };
};

export const PATCH = withAdmin(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const patch = buildGuestPatch(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No editable fields in request' }, { status: 400 });
  }
  if ('registeredById' in patch) {
    if (patch.registeredById === id) {
      return NextResponse.json({ error: 'A guest cannot be linked to themselves' }, { status: 400 });
    }
    if (patch.registeredById) {
      const primary = await prisma.guest.findUnique({ where: { id: patch.registeredById } });
      if (!primary || primary.registeredById !== null) {
        return NextResponse.json({ error: 'Party link must point at a primary registrant' }, { status: 400 });
      }
    }
    const familyCount = await prisma.guest.count({ where: { registeredById: id } });
    if (familyCount > 0 && patch.registeredById !== null && patch.registeredById !== undefined) {
      return NextResponse.json(
        { error: 'Unlink this guest’s family members before making them part of another party' },
        { status: 400 },
      );
    }
  }
  const updateData: GuestPatch & { inviteeId?: string | null } = { ...patch };
  if (patch.registeredById) {
    const primary = await prisma.guest.findUnique({ where: { id: patch.registeredById } });
    if (primary) {
      updateData.inviteeId = primary.inviteeId;
      updateData.rsvp = primary.rsvp;
    }
  }
  const guest = await prisma.guest.update({ where: { id }, data: updateData }).catch(() => null);
  if (!guest) {
    return NextResponse.json({ error: 'Update failed' }, { status: 409 });
  }
  const guestFields = await resolveGuestAdminFields(guest);
  return NextResponse.json({ ok: true, guest: guestFields });
});

// Removes one registration. Anyone this guest registered stays, with a null
// registeredById (schema onDelete: SetNull) — deleting a parent row never
// silently takes the rest of their party with it.
export const DELETE = withAdmin(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const guest = await prisma.guest.delete({ where: { id } }).catch(() => null);
  if (!guest) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
});
