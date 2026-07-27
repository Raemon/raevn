import type { Guest, Invitee, MenuOption } from '@prisma/client';

// Server-to-client row shapes: dates become ISO strings, relation ids get a
// resolved display name alongside the raw value.

export type InviteeAdminRow = Omit<Invitee, 'invitationSentAt'> & {
  invitationSentAt: string | null;
};

export type GuestAdminRow = Omit<Guest, 'createdAt'> & {
  createdAt: string;
  registeredByName: string | null;
  inviteeName: string | null;
};

export type MenuOptionAdminRow = Omit<MenuOption, 'createdAt'> & {
  createdAt: string;
};
