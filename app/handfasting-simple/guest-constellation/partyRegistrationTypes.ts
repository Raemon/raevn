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
  // Free-text message for the hosts, offered on both the accept and decline
  // paths; omitted entirely when the guest left it blank.
  note?: string;
  inviteToken?: string;
  family: PartyMemberSubmission[];
};

// Client-side editing state for one family row; draftKey is the React key only.
export type FamilyMemberDraft = {
  draftKey: string;
  name: string;
  diet: Diet;
  isChildUnder2: boolean;
  needsHighChair: boolean;
};

// One dish from /api/handfasting-simple/menu-options, shown when a guest
// hovers a diet choice on the RSVP form.
export type MenuOptionPreview = {
  name: string;
  description: string;
  diet: Diet;
};
