import type { GuestWithOptimistic } from './guestTypes';
import type { PartyMemberSubmission, PartyRegistrationPayload } from './partyRegistrationTypes';
import type { InviteeTapestryHint } from '../../tapestry/tapestryTypes';
import { issueTemporaryGuestIdentity } from './issueTemporaryGuestIdentity';

// Fabricates believable placeholders so optimistic UI feels instant beneath the skyline.

export const buildOptimisticGuestPlaceholder = (
  member: PartyMemberSubmission,
  temporaryIdentifier: string,
  rsvp: boolean | null,
  registeredById: string | null,
): GuestWithOptimistic => ({
  id: temporaryIdentifier,
  name: member.name,
  diet: member.diet,
  rsvp,
  isChildUnder2: member.isChildUnder2,
  needsHighChair: member.needsHighChair,
  registeredById,
  // The note never shows in the sky, so the placeholder need not carry it.
  note: null,
  inviteeId: null,
  invitee: null,
  meaningful: false,
  plusOne: '',
  createdAt: new Date().toISOString(),
  optimistic: true,
});

// Mints one placeholder per party member, primary first, mirroring the order
// the API returns so the eventual swap can pair rows by position.

export const buildOptimisticPartyPlaceholders = (
  party: PartyRegistrationPayload,
  inviteeTapestryHint?: InviteeTapestryHint,
): { placeholderRows: GuestWithOptimistic[]; temporaryIdentifiers: string[] } => {
  const primaryAsMember: PartyMemberSubmission = {
    name: party.name,
    diet: party.diet,
    isChildUnder2: false,
    needsHighChair: false,
  };
  const partyMembers = [primaryAsMember, ...party.family];
  const temporaryIdentifiers = partyMembers.map(() => issueTemporaryGuestIdentity());
  const placeholderRows = partyMembers.map((member, memberIndex) => {
    const row = buildOptimisticGuestPlaceholder(
      member,
      temporaryIdentifiers[memberIndex],
      party.rsvp,
      memberIndex === 0 ? null : temporaryIdentifiers[0],
    );
    if (memberIndex === 0 && inviteeTapestryHint) {
      row.invitee = {
        side: inviteeTapestryHint.side,
        diagramHovertext: inviteeTapestryHint.diagramHovertext ?? null,
      };
    }
    return row;
  });
  return { placeholderRows, temporaryIdentifiers };
};
