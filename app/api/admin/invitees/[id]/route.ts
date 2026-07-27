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
  return patch;
};

export const PATCH = withAdmin(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const patch = buildInviteePatch(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No editable fields in request' }, { status: 400 });
  }
  const invitee = await prisma.invitee.update({ where: { id }, data: patch }).catch(() => null);
  if (!invitee) {
    // Unknown id, or a (side, name) uniqueness collision.
    return NextResponse.json({ error: 'Update failed' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
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
