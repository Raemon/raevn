import { prisma } from '@/lib/prisma';
import { inviteeRowToTapestryPerson } from '../tapestry/personAdapters';
import type { TapestryPerson } from '../tapestry/tapestryTypes';
import { buildSampleGuestList } from './sampleGuestList';
import TapestryPreviewClient from './TapestryPreviewClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tapestry preview — Ray & Elizabeth',
};

// What the tapestry will look like on the big day: the entire invite list
// rendered as though every single invitee has RSVP'd yes.
export default async function TapestryPreviewPage() {
  let persons: TapestryPerson[] = [];
  try {
    const invitees = await prisma.invitee.findMany({
      select: { id: true, name: true, side: true, diagramHovertext: true },
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
  return <TapestryPreviewClient persons={persons} usingSampleData={usingSampleData} />;
}
