import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getViewerInviteeId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// What this invitation has already answered, so a reloaded page reopens on the
// guest's own RSVP instead of a blank pair of buttons. The newest primary row
// wins: older ones are leftovers from before answers were editable in place.

export async function GET() {
  const viewerInviteeId = await getViewerInviteeId();
  // Not an error — an admin or a stranger simply has no registration of their own.
  if (!viewerInviteeId) return NextResponse.json(null, { headers: { 'Cache-Control': 'private, no-store' } });
  const primary = await prisma.guest.findFirst({
    where: { inviteeId: viewerInviteeId, registeredById: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  if (!primary) return NextResponse.json(null, { headers: { 'Cache-Control': 'private, no-store' } });
  const family = await prisma.guest.findMany({
    where: { registeredById: primary.id },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json({ primary, family }, { headers: { 'Cache-Control': 'private, no-store' } });
}
