import { NextResponse } from 'next/server';
import { getViewerInviteeId, isAdmin } from '@/lib/auth';

// The Apple-calendar download, previously a static file in public/. It lives
// behind the viewer cookie now because LOCATION carries the street address —
// the one detail the locked shell deliberately withholds. Same URL as before,
// so the ribbon's blueprint (HANDFASTING_ICS_ROUTE) didn't have to change.

export const dynamic = 'force-dynamic';

const ICS_CONTENT = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Ray and Elizabeth//Handfasting//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VTIMEZONE
TZID:America/Los_Angeles
BEGIN:DAYLIGHT
TZOFFSETFROM:-0800
TZOFFSETTO:-0700
TZNAME:PDT
DTSTART:20260308T020000
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0700
TZOFFSETTO:-0800
TZNAME:PST
DTSTART:20261101T020000
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
UID:ray-elizabeth-handfasting-2026-10-24@raevn
DTSTAMP:20260513T000000Z
DTSTART;TZID=America/Los_Angeles:20261024T160000
DTEND;TZID=America/Los_Angeles:20261024T190000
SUMMARY:Ray & Elizabeth Handfasting
LOCATION:9777 Golf Links Rd\\, Oakland\\, CA 94605
DESCRIPTION:Round 2 of an iterated exponential kickstarter of love and trust. Save the date — 4pm PT!
END:VEVENT
END:VCALENDAR
`;

export async function GET() {
  if (!(await getViewerInviteeId()) && !(await isAdmin())) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  return new NextResponse(ICS_CONTENT, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ray-elizabeth-handfasting.ics"',
      'Cache-Control': 'private, no-store',
    },
  });
}
