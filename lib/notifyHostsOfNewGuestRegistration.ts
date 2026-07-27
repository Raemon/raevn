import type { Guest } from '@prisma/client';
import { describePartyMember, describeRsvp, sendHostNotificationEmail } from '@/lib/hostNotificationEmail';

export async function notifyHostsOfNewGuestRegistration(partyRows: Guest[]): Promise<void> {
  const [primary] = partyRows;
  if (!primary) return;
  const familyCount = partyRows.length - 1;
  await sendHostNotificationEmail(
    `New handfasting registration: ${primary.name}${familyCount > 0 ? ` (+${familyCount})` : ''}`,
    [
      `${primary.name} just registered for the handfasting (${describeRsvp(primary.rsvp)}).`,
      '',
      'Party:',
      ...partyRows.map(describePartyMember),
      ...(primary.note ? ['', 'They left a note:', primary.note] : []),
    ],
  );
}
