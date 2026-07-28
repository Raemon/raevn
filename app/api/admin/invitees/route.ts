import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { sideBlendFromSide } from '@/lib/sideBlend';

// Creates a blank invitee for the admin table to edit in place. Tokens are
// minted here the same way scripts/seed-invitees.mjs mints them, so a
// hand-added invitee has a working /invite/[token] link immediately.

const PLACEHOLDER_NAME = 'New invitee';

export const POST = withAdmin(async (request: Request) => {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const side = typeof body.side === 'string' && body.side.trim() !== '' ? body.side.trim() : 'both';
  const requestedName =
    typeof body.name === 'string' && body.name.trim() !== '' ? body.name.trim() : PLACEHOLDER_NAME;
  const highest = await prisma.invitee.findFirst({
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  const sortOrder = (highest?.sortOrder ?? -1) + 1;

  // (side, name) is unique, so adding two blank rows in a row would collide;
  // suffix the placeholder until one is free rather than failing the click.
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const name = attempt === 1 ? requestedName : `${requestedName} ${attempt}`;
    const invitee = await prisma.invitee
      .create({
        data: {
          side,
          sideBlend: sideBlendFromSide(side),
          name,
          sortOrder,
          inviteToken: randomBytes(16).toString('hex'),
        },
      })
      .catch(() => null);
    if (invitee) {
      return NextResponse.json({
        invitee: {
          ...invitee,
          invitationSentAt: invitee.invitationSentAt?.toISOString() ?? null,
          partyWithName: null,
        },
      });
    }
  }
  return NextResponse.json({ error: 'Could not create an invitee' }, { status: 409 });
});
