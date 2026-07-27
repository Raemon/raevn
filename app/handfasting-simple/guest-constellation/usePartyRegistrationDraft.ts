'use client';

import { useState } from 'react';
import type { Diet } from '@prisma/client';
import type { FamilyMemberDraft, PartyRegistrationPayload } from './partyRegistrationTypes';
import {
  discardFamilyMemberDraft,
  mintEmptyFamilyMemberDraft,
  patchFamilyMemberDraft,
} from './familyMemberDraftHelpers';
import { MAX_FAMILY_MEMBERS, MAX_GUEST_NAME_LENGTH } from './partyLimits';

// Holds everything the registration panel edits besides the name itself, and
// assembles the wire payload with the same trim/drop-empties rules the server applies.

export const usePartyRegistrationDraft = (inviteToken?: string) => {
  const [primaryDiet, setPrimaryDiet] = useState<Diet>('omnivore');
  const [familyDrafts, setFamilyDrafts] = useState<FamilyMemberDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const appendFamilyDraft = (): void =>
    setFamilyDrafts((drafts) =>
      drafts.length >= MAX_FAMILY_MEMBERS ? drafts : [...drafts, mintEmptyFamilyMemberDraft()],
    );
  const patchFamilyDraft = (draftKey: string, patch: Partial<Omit<FamilyMemberDraft, 'draftKey'>>): void =>
    setFamilyDrafts((drafts) => patchFamilyMemberDraft(drafts, draftKey, patch));
  const discardFamilyDraft = (draftKey: string): void =>
    setFamilyDrafts((drafts) => discardFamilyMemberDraft(drafts, draftKey));

  const assemblePartyPayload = (enteredNameTrimmed: string): PartyRegistrationPayload => ({
    name: enteredNameTrimmed.slice(0, MAX_GUEST_NAME_LENGTH),
    diet: primaryDiet,
    // Registering means attending; the form no longer asks.
    rsvp: true,
    ...(inviteToken ? { inviteToken } : {}),
    family: familyDrafts
      .map((draft) => ({
        name: draft.name.trim().slice(0, MAX_GUEST_NAME_LENGTH),
        diet: draft.diet,
        isChildUnder2: draft.isChildUnder2,
        needsHighChair: draft.needsHighChair,
      }))
      .filter((member) => member.name !== ''),
  });

  const resetPartyDraft = (): void => {
    setPrimaryDiet('omnivore');
    setFamilyDrafts([]);
  };

  return {
    primaryDiet,
    setPrimaryDiet,
    familyDrafts,
    appendFamilyDraft,
    patchFamilyDraft,
    discardFamilyDraft,
    isSubmitting,
    setIsSubmitting,
    assemblePartyPayload,
    resetPartyDraft,
  };
};
