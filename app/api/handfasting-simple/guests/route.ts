import { NextResponse } from 'next/server';
import type { Guest } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { notifyHostsOfNewGuestRegistration } from '@/lib/notifyHostsOfNewGuestRegistration';
import { parsePartyRegistrationBody } from './parsePartyRegistrationBody';

export async function GET() {
  // Only confirmed attendees appear in the constellation; id tie-break keeps
  // same-millisecond party rows in a stable order across refreshes.
  const guests = await prisma.guest.findMany({
    where: { rsvp: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json(guests);
}

export async function POST(request: Request) {
  const payload = parsePartyRegistrationBody(await request.json());
  if (!payload) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  // A forged or stale token just means the registration goes unlinked.
  const invitee = payload.inviteToken
    ? await prisma.invitee.findUnique({ where: { inviteToken: payload.inviteToken } })
    : null;
  // Sequential creates inside one transaction: response order mirrors request
  // order (primary first), which the optimistic swap on the client relies on.
  const partyRows = await prisma.$transaction(async (tx) => {
    const primary = await tx.guest.create({
      data: {
        name: payload.name,
        diet: payload.diet,
        rsvp: payload.rsvp,
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
