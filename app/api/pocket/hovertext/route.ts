import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withPocketKey } from '@/lib/pocketAccess';

// The phone editor's entire API surface: read the invitee list, write one
// invitee's diagram hovertext. Deliberately not a general invitee endpoint —
// whoever holds the secret URL can only rewrite the hover notes.

export const dynamic = 'force-dynamic';

const POCKET_FIELDS = {
  id: true,
  name: true,
  side: true,
  sideBlend: true,
  diagramHovertext: true,
} as const;

export const GET = withPocketKey(async () => {
  const invitees = await prisma.invitee.findMany({
    orderBy: { sortOrder: 'asc' },
    select: POCKET_FIELDS,
  });
  return NextResponse.json({ invitees });
});

export const PATCH = withPocketKey(async (request: Request) => {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.id === 'string' ? body.id : '';
  if (id === '' || typeof body?.diagramHovertext !== 'string') {
    return NextResponse.json({ error: 'Expected { id, diagramHovertext }' }, { status: 400 });
  }
  // Same emptiness rule as the ledger's cell edit: a blank box clears the note
  // rather than storing whitespace the tapestry would render as an empty
  // tooltip.
  const diagramHovertext = body.diagramHovertext.trim() === '' ? null : body.diagramHovertext;
  const invitee = await prisma.invitee
    .update({ where: { id }, data: { diagramHovertext }, select: POCKET_FIELDS })
    .catch(() => null);
  if (!invitee) return NextResponse.json({ error: 'Unknown invitee' }, { status: 404 });
  return NextResponse.json({ ok: true, invitee });
});
