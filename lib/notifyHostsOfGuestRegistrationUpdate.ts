import type { Guest } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  describeGuestRowRevisionChanges,
  describePartyMember,
  describeRsvp,
  sendHostNotificationEmail,
} from '@/lib/hostNotificationEmail';

const partySubjectSuffix = (familyCount: number): string => (familyCount > 0 ? ` (+${familyCount})` : '');

const loadRegistrationParty = async (
  guestRow: Guest,
): Promise<{ primary: Guest; partyRows: Guest[] } | null> => {
  const primary = guestRow.registeredById
    ? await prisma.guest.findUnique({ where: { id: guestRow.registeredById } })
    : guestRow;
  if (!primary) return null;
  const family = await prisma.guest.findMany({
    where: { registeredById: primary.id },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  return { primary, partyRows: [primary, ...family] };
};

export async function notifyHostsOfGuestRowRevision(before: Guest, after: Guest): Promise<void> {
  const changes = describeGuestRowRevisionChanges(before, after);
  if (changes.length === 0) return;
  const registration = await loadRegistrationParty(after);
  if (!registration) return;
  const { primary, partyRows } = registration;
  const familyCount = partyRows.length - 1;
  const editedMemberName = after.registeredById ? after.name : primary.name;
  await sendHostNotificationEmail(
    `Handfasting RSVP updated: ${primary.name}${partySubjectSuffix(familyCount)}`,
    [
      `${primary.name} updated their registration (${describeRsvp(primary.rsvp)}):`,
      '',
      ...(after.registeredById ? [`${editedMemberName}:`] : []),
      ...changes.map((change) => `- ${change}`),
      '',
      'Party (now):',
      ...partyRows.map(describePartyMember),
    ],
  );
}

export async function notifyHostsOfFamilyMemberAdded(primary: Guest, familyRow: Guest): Promise<void> {
  const registration = await loadRegistrationParty(primary);
  if (!registration) return;
  const { partyRows } = registration;
  const familyCount = partyRows.length - 1;
  await sendHostNotificationEmail(
    `Handfasting RSVP updated: ${primary.name}${partySubjectSuffix(familyCount)}`,
    [
      `${primary.name} added a family member to their registration (${describeRsvp(primary.rsvp)}):`,
      '',
      describePartyMember(familyRow),
      '',
      'Party (now):',
      ...partyRows.map(describePartyMember),
    ],
  );
}

export async function notifyHostsOfGuestRowRemoval(removedRows: Guest[]): Promise<void> {
  const [firstRemoved] = removedRows;
  if (!firstRemoved) return;
  const isPrimaryRemoval = firstRemoved.registeredById === null;
  if (isPrimaryRemoval) {
    const [primary] = removedRows;
    if (!primary) return;
    await sendHostNotificationEmail(`Handfasting RSVP withdrawn: ${primary.name}`, [
      `${primary.name} withdrew their registration (${describeRsvp(primary.rsvp)}).`,
      '',
      'Removed party:',
      ...removedRows.map(describePartyMember),
      ...(primary.note ? ['', 'Their note was:', primary.note] : []),
    ]);
    return;
  }
  const primary = firstRemoved.registeredById
    ? await prisma.guest.findUnique({ where: { id: firstRemoved.registeredById } })
    : null;
  if (!primary) return;
  const registration = await loadRegistrationParty(primary);
  if (!registration) return;
  const { partyRows } = registration;
  const familyCount = partyRows.length - 1;
  await sendHostNotificationEmail(
    `Handfasting RSVP updated: ${primary.name}${partySubjectSuffix(familyCount)}`,
    [
      `${primary.name} removed a family member from their registration (${describeRsvp(primary.rsvp)}):`,
      '',
      ...removedRows.map(describePartyMember),
      '',
      'Party (now):',
      ...partyRows.map(describePartyMember),
    ],
  );
}
