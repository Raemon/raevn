import type { GuestAdminRow, InviteeAdminRow } from './adminRowTypes';

// Who the Emails tab writes to: everyone registered who hasn't said no.
// Registrations carry no address of their own — it lives on the invitee whose
// link was used — so a family member reaches us through their registrant's
// invite, and a party that registered together gets one email, not one each.
// Shared by the tab's preview and the send route so the list you read is the
// list that gets mailed.

export type GuestEmailRecipient = {
  inviteeId: string;
  name: string;
  email: string;
  inviteToken: string | null;
};

export const selectGuestEmailRecipients = (
  invitees: InviteeAdminRow[],
  guests: GuestAdminRow[],
): { recipients: GuestEmailRecipient[]; unreachableGuestNames: string[] } => {
  const inviteeById = new Map(invitees.map((invitee) => [invitee.id, invitee]));
  const guestById = new Map(guests.map((guest) => [guest.id, guest]));
  const recipientsByEmail = new Map<string, GuestEmailRecipient>();
  const unreachableGuestNames: string[] = [];

  for (const guest of guests) {
    if (guest.rsvp === false) continue;
    const inviteeId =
      guest.inviteeId ?? (guest.registeredById ? guestById.get(guest.registeredById)?.inviteeId : null);
    const invitee = inviteeId ? inviteeById.get(inviteeId) : undefined;
    const email = invitee?.email?.trim();
    if (!invitee || !email) {
      unreachableGuestNames.push(guest.name);
      continue;
    }
    const emailKey = email.toLowerCase();
    if (!recipientsByEmail.has(emailKey)) {
      recipientsByEmail.set(emailKey, {
        inviteeId: invitee.id,
        name: invitee.name,
        email,
        inviteToken: invitee.inviteToken,
      });
    }
  }

  return { recipients: [...recipientsByEmail.values()], unreachableGuestNames };
};
