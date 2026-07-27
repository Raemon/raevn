import { NextResponse } from 'next/server';
import type { Guest } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getViewerInviteeId, isAdmin } from '@/lib/auth';
import { notifyHostsOfNewGuestRegistration } from '@/lib/notifyHostsOfNewGuestRegistration';
import { parsePartyRegistrationBody } from './parsePartyRegistrationBody';

export const dynamic = 'force-dynamic';

// One invitee link registering this many rows is not a wedding party, it's a
// script; the cap bounds both DB rows and host-notification emails forever.
const MAX_GUEST_ROWS_PER_INVITEE = 30;

const notAuthorized = () => NextResponse.json({ error: 'Not authorized' }, { status: 401 });

export async function GET() {
  if (!(await getViewerInviteeId()) && !(await isAdmin())) return notAuthorized();
  // Only confirmed attendees appear in the constellation; id tie-break keeps
  // same-millisecond party rows in a stable order across refreshes.
  const guests = await prisma.guest.findMany({
    where: { rsvp: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    // The tapestry places guests on Elizabeth's or Ray's half by invitee side.
    include: { invitee: { select: { side: true } } },
  });
  return NextResponse.json(guests, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request: Request) {
  const viewerInviteeId = await getViewerInviteeId();
  if (!viewerInviteeId && !(await isAdmin())) return notAuthorized();
  const payload = parsePartyRegistrationBody(await request.json());
  if (!payload) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  // Attribution comes from the session cookie; the body token remains only as
  // a fallback until the client stops sending it. A forged or stale token
  // just means the registration goes unlinked.
  const invitee = viewerInviteeId
    ? await prisma.invitee.findUnique({ where: { id: viewerInviteeId } })
    : payload.inviteToken
      ? await prisma.invitee.findUnique({ where: { inviteToken: payload.inviteToken } })
      : null;
  if (invitee) {
    const existingRows = await prisma.guest.count({ where: { inviteeId: invitee.id } });
    if (existingRows + 1 + payload.family.length > MAX_GUEST_ROWS_PER_INVITEE) {
      return NextResponse.json(
        { error: 'This invitation has registered as many guests as it can — contact Ray or Elizabeth.' },
        { status: 429 },
      );
    }
  }
  // Sequential creates inside one transaction: response order mirrors request
  // order (primary first), which the optimistic swap on the client relies on.
  const partyRows = await prisma.$transaction(async (tx) => {
    const primary = await tx.guest.create({
      data: {
        name: payload.name,
        diet: payload.diet,
        rsvp: payload.rsvp,
        // The note is the primary registrant's alone; family rows stay bare.
        note: payload.note ?? null,
        inviteeId: invitee?.id ?? null,
        meaningful: false,
        plusOne: '',
      },
    });
    const familyRows: Guest[] = [];
    for (const member of payload.family) {
      familyRows.push(
        await tx.guest.create({
          data: {
            name: member.name,
            diet: member.diet,
            isChildUnder2: member.isChildUnder2,
            needsHighChair: member.needsHighChair,
            rsvp: payload.rsvp,
            registeredById: primary.id,
            inviteeId: invitee?.id ?? null,
            meaningful: false,
            plusOne: '',
          },
        }),
      );
    }
    return [primary, ...familyRows];
  });
  void notifyHostsOfNewGuestRegistration(partyRows);
  return NextResponse.json(partyRows);
}
