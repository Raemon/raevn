import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';

// Partial update of host-editable invitee fields — table cell edits and the
// TipTap invitation letter. Unknown fields are ignored.

type InviteePatch = {
  side?: string;
  name?: string;
  email?: string | null;
  note?: string | null;
  diagramHovertext?: string | null;
  sortOrder?: number;
  invitationHtml?: string | null;
  partyWithId?: string | null;
};

const buildInviteePatch = (body: Record<string, unknown>): InviteePatch => {
  const patch: InviteePatch = {};
  if (typeof body.side === 'string' && body.side.trim() !== '') patch.side = body.side.trim();
  if (typeof body.name === 'string' && body.name.trim() !== '') patch.name = body.name.trim();
  if (typeof body.email === 'string') patch.email = body.email.trim() === '' ? null : body.email.trim();
  if (typeof body.note === 'string') patch.note = body.note.trim() === '' ? null : body.note;
  if (typeof body.diagramHovertext === 'string') {
    patch.diagramHovertext = body.diagramHovertext.trim() === '' ? null : body.diagramHovertext;
  }
  if (typeof body.sortOrder === 'number' && Number.isInteger(body.sortOrder)) patch.sortOrder = body.sortOrder;
  if ('invitationHtml' in body) {
    patch.invitationHtml =
      typeof body.invitationHtml === 'string' && body.invitationHtml.trim() !== ''
        ? body.invitationHtml
        : null;
  }
  if ('partyWithId' in body) {
    patch.partyWithId =
      body.partyWithId === null || body.partyWithId === ''
        ? null
        : typeof body.partyWithId === 'string' && body.partyWithId.trim() !== ''
          ? body.partyWithId.trim()
          : undefined;
  }
  return patch;
};

const resolveInviteeAdminFields = async (invitee: {
  id: string;
  partyWithId: string | null;
  side: string;
}) => {
  const partyWith = invitee.partyWithId
    ? await prisma.invitee.findUnique({ where: { id: invitee.partyWithId }, select: { name: true } })
    : null;
  return {
    partyWithId: invitee.partyWithId,
    partyWithName: partyWith?.name ?? null,
    side: invitee.side,
  };
};

export const PATCH = withAdmin(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const patch = buildInviteePatch(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No editable fields in request' }, { status: 400 });
  }
  if ('partyWithId' in patch) {
    if (patch.partyWithId === id) {
      return NextResponse.json({ error: 'An invitee cannot be linked to themselves' }, { status: 400 });
    }
    if (patch.partyWithId) {
      const primary = await prisma.invitee.findUnique({ where: { id: patch.partyWithId } });
      if (!primary || primary.partyWithId !== null) {
        return NextResponse.json({ error: 'Party link must point at a primary invitee' }, { status: 400 });
      }
    }
    const partyMemberCount = await prisma.invitee.count({ where: { partyWithId: id } });
    if (partyMemberCount > 0 && patch.partyWithId) {
      return NextResponse.json(
        { error: 'Unlink this invitee’s party members before making them part of another party' },
        { status: 400 },
      );
    }
  }
  const updateData: InviteePatch = { ...patch };
  if (patch.partyWithId) {
    const primary = await prisma.invitee.findUnique({ where: { id: patch.partyWithId } });
    if (primary) updateData.side = primary.side;
  }
  const invitee = await prisma.invitee.update({ where: { id }, data: updateData }).catch(() => null);
  if (!invitee) {
    // Unknown id, or a (side, name) uniqueness collision.
    return NextResponse.json({ error: 'Update failed' }, { status: 409 });
  }
  const inviteeFields = await resolveInviteeAdminFields(invitee);
  return NextResponse.json({ ok: true, invitee: inviteeFields });
});

// Removes an invitee outright. Any registrations that arrived through this
// invitee's link survive with a null inviteeId (schema onDelete: SetNull).
export const DELETE = withAdmin(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const invitee = await prisma.invitee.delete({ where: { id } }).catch(() => null);
  if (!invitee) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
});
