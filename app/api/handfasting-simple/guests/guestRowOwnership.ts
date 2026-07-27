import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getViewerInviteeId, isAdmin } from '@/lib/auth';

// The RSVP panel writes an answer the moment a guest clicks it and then keeps
// editing that registration — diet, note, family — so every edit route needs
// the same question answered: is this row one of yours? Ownership is the viewer
// cookie's invitee. Rows with no inviteeId (registered before the session
// cookie existed) have no owner, so only an admin can reach them.

export const notAuthorized = () => NextResponse.json({ error: 'Not authorized' }, { status: 401 });

export const mayEditGuestRow = async (guestId: string): Promise<boolean> => {
  if (await isAdmin()) return true;
  const viewerInviteeId = await getViewerInviteeId();
  if (!viewerInviteeId) return false;
  const guest = await prisma.guest.findUnique({ where: { id: guestId }, select: { inviteeId: true } });
  return !!guest && guest.inviteeId === viewerInviteeId;
};
