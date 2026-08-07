import type { GuestAdminRow, InviteeAdminRow } from './adminRowTypes';

// "We emailed them and nothing came back": an invitee whose invitation was
// actually sent and who has no registration pointing at their invite.
//
// A registration links to whichever invite token was used, so when two people
// share a party only the one who followed their own link looks answered. The
// other still belongs on this list — they haven't replied themselves — but
// `partyAnswered` marks the case so a nudge doesn't go out twice to a couple
// who already RSVP'd together.

export type AwaitingReplyRow = InviteeAdminRow & { partyAnswered: boolean };

const partyIdOf = (invitee: InviteeAdminRow): string => invitee.partyWithId ?? invitee.id;

export const selectAwaitingReply = (
  invitees: InviteeAdminRow[],
  guests: GuestAdminRow[],
): AwaitingReplyRow[] => {
  const answeredInviteeIds = new Set(
    guests.map((guest) => guest.inviteeId).filter((inviteeId): inviteeId is string => !!inviteeId),
  );
  const answeredPartyIds = new Set(
    invitees.filter((invitee) => answeredInviteeIds.has(invitee.id)).map(partyIdOf),
  );

  return invitees
    .filter((invitee) => !!invitee.invitationSentAt && !answeredInviteeIds.has(invitee.id))
    .map((invitee) => ({ ...invitee, partyAnswered: answeredPartyIds.has(partyIdOf(invitee)) }));
};
