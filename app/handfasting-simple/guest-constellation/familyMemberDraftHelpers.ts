import type { FamilyMemberDraft } from './partyRegistrationTypes';

export const mintEmptyFamilyMemberDraft = (): FamilyMemberDraft => ({
  draftKey: crypto.randomUUID(),
  persistedId: null,
  name: '',
  diet: null,
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
