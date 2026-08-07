import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { DEFAULT_TAGLINE_HOVERTEXT, getTaglineHovertext } from '@/lib/taglineHovertext';
import { inviteeRowToTapestryPerson } from '../tapestry/personAdapters';
import type { TapestryPerson } from '../tapestry/tapestryTypes';
import { buildSampleGuestList } from './sampleGuestList';
import TapestryPreviewClient from './TapestryPreviewClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tapestry preview — Ray & Elizabeth',
  robots: { index: false, follow: false },
};

// What the tapestry will look like on the big day: the entire invite list
// rendered as though every single invitee has RSVP'd yes. Host-only — it
// shows people who haven't been told they're invited yet.
export default async function TapestryPreviewPage() {
  if (!(await isAdmin())) notFound();
  // This page survives an unreachable database (see below), so the tagline
  // note falls back to its built-in text rather than taking the page down.
  const taglineHovertext = await getTaglineHovertext().catch(() => DEFAULT_TAGLINE_HOVERTEXT);
  let persons: TapestryPerson[] = [];
  try {
    const invitees = await prisma.invitee.findMany({
      select: { id: true, name: true, side: true, sideBlend: true, diagramHovertext: true },
      orderBy: [{ side: 'asc' }, { sortOrder: 'asc' }],
    });
    persons = invitees.map(inviteeRowToTapestryPerson);
  } catch (error) {
    // Database unreachable (e.g. offline dev) — fall through to sample names.
    // Say so loudly: a silent swap to invented names looks like real data.
    console.error('[preview] invite list unreachable, using sample names:', error);
  }
  const usingSampleData = persons.length < 8;
  if (usingSampleData) {
    persons = buildSampleGuestList();
  }
  return (
    <TapestryPreviewClient
      persons={persons}
      usingSampleData={usingSampleData}
      taglineHovertext={taglineHovertext}
    />
  );
}
