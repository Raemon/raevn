import { prisma } from '@/lib/prisma';
import type { GuestAdminRow, InviteeAdminRow, MenuOptionAdminRow } from './adminRowTypes';

// The one place invitee, guest, and menu rows get shaped for the admin tables:
// the page renders the first copy, and /api/admin/rows re-reads it every few
// seconds so two people editing the ledger at once see each other's changes.

export const loadAdminRows = async (): Promise<{
  invitees: InviteeAdminRow[];
  guests: GuestAdminRow[];
  menuOptions: MenuOptionAdminRow[];
}> => {
  const [invitees, guests, menuOptions] = await Promise.all([
    prisma.invitee.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.guest.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
    prisma.menuOption.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
  ]);

  const guestNameById = new Map(guests.map((guest) => [guest.id, guest.name]));
  const inviteeNameById = new Map(invitees.map((invitee) => [invitee.id, invitee.name]));

  return {
    invitees: invitees.map((invitee) => ({
      ...invitee,
      invitationSentAt: invitee.invitationSentAt?.toISOString() ?? null,
      partyWithName: invitee.partyWithId ? inviteeNameById.get(invitee.partyWithId) ?? null : null,
    })),
    guests: guests.map((guest) => ({
      ...guest,
      createdAt: guest.createdAt.toISOString(),
      registeredByName: guest.registeredById
        ? guestNameById.get(guest.registeredById) ?? null
        : null,
      inviteeName: guest.inviteeId ? inviteeNameById.get(guest.inviteeId) ?? null : null,
    })),
    menuOptions: menuOptions.map((menuOption) => ({
      ...menuOption,
      createdAt: menuOption.createdAt.toISOString(),
    })),
  };
};
