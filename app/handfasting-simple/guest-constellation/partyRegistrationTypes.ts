import type { Diet } from '@prisma/client';

// The catalog requires every row to hold a diet, but the form starts with none
// selected so the choice is always the guest's own. A row that gets recorded
// before they pick carries this until they do — 'none' rather than a real diet,
// so an unanswered row never reads as a headcount for a meal nobody asked for.
export const UNCHOSEN_DIET_FALLBACK: Diet = 'none';

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
// persistedId is the catalog row this draft is saving itself onto — null while
// the guest is still typing a name nobody has been registered under yet.
// diet is null until somebody actually picks one.
export type FamilyMemberDraft = {
  draftKey: string;
  persistedId: string | null;
  name: string;
  diet: Diet | null;
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
