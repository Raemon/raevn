import { NextResponse } from 'next/server';
import type { Diet } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { MAX_FAMILY_MEMBERS, MAX_GUEST_NAME_LENGTH } from '@/app/handfasting-simple/guest-constellation/partyLimits';
import { notifyHostsOfFamilyMemberAdded } from '@/lib/notifyHostsOfGuestRegistrationUpdate';
import { mayEditGuestRow, notAuthorized } from '../../guestRowOwnership';

export const dynamic = 'force-dynamic';

// Adds one family member to a registration that already exists. Family used to
// arrive with the initial POST; now that an RSVP is recorded on the click
// itself, anyone added afterwards comes through here instead.

const DIET_ALLOWLIST = new Set<string>(['omnivore', 'vegetarian', 'vegan', 'none']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await mayEditGuestRow(id))) return notAuthorized();
  const primary = await prisma.guest.findUnique({ where: { id } });
  if (!primary) return NextResponse.json({ error: 'No such registration' }, { status: 404 });
  const body = (await request.json()) as {
    name?: unknown;
    diet?: unknown;
    isChildUnder2?: unknown;
    needsHighChair?: unknown;
  } | null;
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, MAX_GUEST_NAME_LENGTH) : '';
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const existingFamily = await prisma.guest.count({ where: { registeredById: primary.id } });
  if (existingFamily >= MAX_FAMILY_MEMBERS) {
    return NextResponse.json({ error: 'That is as many family members as one registration can hold.' }, { status: 429 });
  }
  // A family member inherits the primary's answer and invitation: they are
  // coming (or not) as part of that party, never on their own terms.
  const familyRow = await prisma.guest.create({
    data: {
      name,
      diet: typeof body?.diet === 'string' && DIET_ALLOWLIST.has(body.diet) ? (body.diet as Diet) : 'none',
      isChildUnder2: body?.isChildUnder2 === true,
      needsHighChair: body?.needsHighChair === true,
      rsvp: primary.rsvp,
      registeredById: primary.id,
      inviteeId: primary.inviteeId,
      meaningful: false,
      plusOne: '',
    },
  });
  void notifyHostsOfFamilyMemberAdded(primary, familyRow);
  return NextResponse.json(familyRow);
}
