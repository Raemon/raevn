import type { GuestWithOptimistic } from './guestTypes';
import type { PartyMemberSubmission, PartyRegistrationPayload } from './partyRegistrationTypes';
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
  inviteeId: null,
  meaningful: false,
  plusOne: '',
  createdAt: new Date().toISOString(),
  optimistic: true,
});

// Mints one placeholder per party member, primary first, mirroring the order
// the API returns so the eventual swap can pair rows by position.

export const buildOptimisticPartyPlaceholders = (
  party: PartyRegistrationPayload,
): { placeholderRows: GuestWithOptimistic[]; temporaryIdentifiers: string[] } => {
  const primaryAsMember: PartyMemberSubmission = {
    name: party.name,
    diet: party.diet,
    isChildUnder2: false,
    needsHighChair: false,
  };
  const partyMembers = [primaryAsMember, ...party.family];
  const temporaryIdentifiers = partyMembers.map(() => issueTemporaryGuestIdentity());
  const placeholderRows = partyMembers.map((member, memberIndex) =>
    buildOptimisticGuestPlaceholder(
      member,
      temporaryIdentifiers[memberIndex],
      party.rsvp,
      memberIndex === 0 ? null : temporaryIdentifiers[0],
    ),
  );
  return { placeholderRows, temporaryIdentifiers };
};
