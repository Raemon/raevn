import type { Diet } from '@prisma/client';

// One attendee on the wire: the primary registrant or a family member.
export type PartyMemberSubmission = {
  name: string;
  diet: Diet;
  isChildUnder2: boolean;
  needsHighChair: boolean;
};

// POST body for /api/handfasting-simple/guests. rsvp: null = undecided.
export type PartyRegistrationPayload = {
  name: string;
  diet: Diet;
  rsvp: boolean | null;
  inviteToken?: string;
  family: PartyMemberSubmission[];
};

// Client-side editing state for one family row; draftKey is the React key only.
export type FamilyMemberDraft = {
  draftKey: string;
  name: string;
  vegan: boolean;
  vegetarian: boolean;
  isChildUnder2: boolean;
  needsHighChair: boolean;
};
