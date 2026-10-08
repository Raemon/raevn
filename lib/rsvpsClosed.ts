import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';

export const RSVPS_CLOSED_SETTING_KEY = 'rsvpsClosed';

// Flipped from the toggle at the top of /admin. While closed, the invite page
// swaps its RSVP panel for a short notice and the guest API refuses writes —
// except from us, so a late answer can still be entered by hand.
export async function getRsvpsClosed(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({
    where: { key: RSVPS_CLOSED_SETTING_KEY },
  });
  return setting?.value === 'true';
}

// Returns the response to send when a guest tries to change their RSVP after
// we've closed them, or null when the write may go ahead.
export async function refuseIfRsvpsClosed(): Promise<NextResponse | null> {
  if (!(await getRsvpsClosed()) || (await isAdmin())) return null;
  return NextResponse.json({ error: 'RSVPs are closed now.' }, { status: 403 });
}
