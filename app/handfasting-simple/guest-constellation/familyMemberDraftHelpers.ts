import type { Diet } from '@prisma/client';
import type { FamilyMemberDraft } from './partyRegistrationTypes';

// Vegan wins if state ever holds both; the checkbox pair keeps them exclusive anyway.

export const deriveDietFromCheckboxes = (vegan: boolean, vegetarian: boolean): Diet =>
  vegan ? 'vegan' : vegetarian ? 'vegetarian' : 'omnivore';

export const mintEmptyFamilyMemberDraft = (): FamilyMemberDraft => ({
  draftKey: crypto.randomUUID(),
  name: '',
  vegan: false,
  vegetarian: false,
  isChildUnder2: false,
  needsHighChair: false,
});

export const patchFamilyMemberDraft = (
  drafts: FamilyMemberDraft[],
  draftKey: string,
  patch: Partial<Omit<FamilyMemberDraft, 'draftKey'>>,
): FamilyMemberDraft[] =>
  drafts.map((draft) => (draft.draftKey === draftKey ? { ...draft, ...patch } : draft));

export const discardFamilyMemberDraft = (
  drafts: FamilyMemberDraft[],
  draftKey: string,
): FamilyMemberDraft[] => drafts.filter((draft) => draft.draftKey !== draftKey);
