import { NextResponse } from 'next/server';
import type { Diet } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { MAX_GUEST_NAME_LENGTH, MAX_GUEST_NOTE_LENGTH } from '@/app/handfasting-simple/guest-constellation/partyLimits';
import { notifyHostsOfGuestRowRemoval, notifyHostsOfGuestRowRevision } from '@/lib/notifyHostsOfGuestRegistrationUpdate';
import { mayEditGuestRow, notAuthorized } from '../guestRowOwnership';

export const dynamic = 'force-dynamic';

// Edits one row of a registration that already exists. The RSVP panel records
// an answer on the click itself, so everything the guest touches afterwards —
// their diet, their note, a family member's details — arrives here as an
// update rather than as a second, contradictory row.

const DIET_ALLOWLIST = new Set<string>(['omnivore', 'vegetarian', 'vegan', 'none']);

type GuestRevisionBody = {
  note?: unknown;
  diet?: unknown;
  name?: unknown;
  isChildUnder2?: unknown;
  needsHighChair?: unknown;
};

// One registration, read back by id. /guests/mine covers a guest who arrived
// through their invite link; this covers the case where the cookie says who
// may edit but not which row — an admin looking at the real page, whose
// browser remembers the registration it made.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await mayEditGuestRow(id))) return notAuthorized();
  const primary = await prisma.guest.findUnique({ where: { id } });
  if (!primary || primary.registeredById !== null) {
    return NextResponse.json(null, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  const family = await prisma.guest.findMany({
    where: { registeredById: primary.id },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json({ primary, family }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await mayEditGuestRow(id))) return notAuthorized();
  const body = (await request.json()) as GuestRevisionBody | null;
  const revision: {
    note?: string | null;
    diet?: Diet;
    name?: string;
    isChildUnder2?: boolean;
    needsHighChair?: boolean;
  } = {};
  if (typeof body?.note === 'string') {
    const trimmedNote = body.note.trim().slice(0, MAX_GUEST_NOTE_LENGTH);
    revision.note = trimmedNote === '' ? null : trimmedNote;
  }
  if (typeof body?.diet === 'string' && DIET_ALLOWLIST.has(body.diet)) revision.diet = body.diet as Diet;
  // A blank name would erase someone from the guest list by accident, so an
  // empty string is ignored; removing a family member is a DELETE.
  if (typeof body?.name === 'string' && body.name.trim() !== '') {
    revision.name = body.name.trim().slice(0, MAX_GUEST_NAME_LENGTH);
  }
  if (typeof body?.isChildUnder2 === 'boolean') revision.isChildUnder2 = body.isChildUnder2;
  if (typeof body?.needsHighChair === 'boolean') revision.needsHighChair = body.needsHighChair;
  if (Object.keys(revision).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }
  const before = await prisma.guest.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: 'No such guest' }, { status: 404 });
  const updated = await prisma.guest.update({ where: { id }, data: revision });
  void notifyHostsOfGuestRowRevision(before, updated);
  return NextResponse.json(updated);
}

// Used to remove a family member, and when a guest flips their answer: the old
// row (and any family rows it brought along) goes away so the replacement
// registration is the only truth.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await mayEditGuestRow(id))) return notAuthorized();
  const guest = await prisma.guest.findUnique({ where: { id } });
  if (!guest) return NextResponse.json({ ok: true });
  const removedRows =
    guest.registeredById === null
      ? [
          guest,
          ...(await prisma.guest.findMany({
            where: { registeredById: id },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          })),
        ]
      : [guest];
  await prisma.guest.deleteMany({ where: { OR: [{ id }, { registeredById: id }] } });
  void notifyHostsOfGuestRowRemoval(removedRows);
  return NextResponse.json({ ok: true });
}
