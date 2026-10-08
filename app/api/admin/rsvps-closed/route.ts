import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { RSVPS_CLOSED_SETTING_KEY } from '@/lib/rsvpsClosed';

// Opens or closes RSVPs. Open is the absence of the row, so reopening leaves
// the settings table exactly as it was before we ever closed them.

export const PATCH = withAdmin(async (request: Request) => {
  const body = (await request.json()) as Record<string, unknown>;
  const closed = body.closed === true;
  if (closed) {
    await prisma.setting.upsert({
      where: { key: RSVPS_CLOSED_SETTING_KEY },
      update: { value: 'true' },
      create: { key: RSVPS_CLOSED_SETTING_KEY, value: 'true' },
    });
  } else {
    await prisma.setting.deleteMany({ where: { key: RSVPS_CLOSED_SETTING_KEY } });
  }
  return NextResponse.json({ ok: true, closed });
});
