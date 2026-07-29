'use client';

import { useCallback, useState } from 'react';
import type { Diet } from '@prisma/client';
import { UNCHOSEN_DIET_FALLBACK } from './partyRegistrationTypes';
import type { FamilyMemberDraft, PartyRegistrationPayload } from './partyRegistrationTypes';
import {
  discardFamilyMemberDraft,
  mintEmptyFamilyMemberDraft,
  patchFamilyMemberDraft,
} from './familyMemberDraftHelpers';
import { MAX_FAMILY_MEMBERS, MAX_GUEST_NAME_LENGTH, MAX_GUEST_NOTE_LENGTH } from './partyLimits';

// Holds everything the registration panel edits besides the name itself, and
// assembles the wire payload with the same trim/drop-empties rules the server applies.

export const usePartyRegistrationDraft = (inviteToken?: string) => {
  // null until the guest picks: the form opens with no diet selected.
  const [primaryDiet, setPrimaryDiet] = useState<Diet | null>(null);
  const [familyDrafts, setFamilyDrafts] = useState<FamilyMemberDraft[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // These keep a stable identity because the autosave effect depends on them;
  // a fresh closure each render would restart its debounce on every keystroke.
  const appendFamilyDraft = useCallback((): void => {
    setFamilyDrafts((drafts) =>
      drafts.length >= MAX_FAMILY_MEMBERS ? drafts : [...drafts, mintEmptyFamilyMemberDraft()],
    );
  }, []);
  const patchFamilyDraft = useCallback(
    (draftKey: string, patch: Partial<Omit<FamilyMemberDraft, 'draftKey'>>): void => {
      setFamilyDrafts((drafts) => patchFamilyMemberDraft(drafts, draftKey, patch));
    },
    [],
  );
  const discardFamilyDraft = useCallback((draftKey: string): void => {
    setFamilyDrafts((drafts) => discardFamilyMemberDraft(drafts, draftKey));
  }, []);
  // The rows these drafts were saving onto are gone — the whole answer was
  // withdrawn or replaced — so the same people have to be registered afresh
  // rather than patched onto ids that no longer exist.
  const releaseFamilyPersistence = useCallback((): void => {
    setFamilyDrafts((drafts) => drafts.map((draft) => ({ ...draft, persistedId: null })));
  }, []);

  // `isAttending` comes from which of the two RSVP buttons opened the panel.
  const assemblePartyPayload = (
    enteredNameTrimmed: string,
    isAttending: boolean,
  ): PartyRegistrationPayload => {
    const trimmedNote = noteDraft.trim().slice(0, MAX_GUEST_NOTE_LENGTH);
    return {
      name: enteredNameTrimmed.slice(0, MAX_GUEST_NAME_LENGTH),
      diet: primaryDiet ?? UNCHOSEN_DIET_FALLBACK,
      rsvp: isAttending,
      ...(trimmedNote !== '' ? { note: trimmedNote } : {}),
      ...(inviteToken ? { inviteToken } : {}),
      // A decline brings nobody along, whatever the diet/family panel held.
      family: isAttending
        ? familyDrafts
            .map((draft) => ({
              name: draft.name.trim().slice(0, MAX_GUEST_NAME_LENGTH),
              diet: draft.diet ?? UNCHOSEN_DIET_FALLBACK,
              isChildUnder2: draft.isChildUnder2,
              needsHighChair: draft.needsHighChair,
            }))
            .filter((member) => member.name !== '')
        : [],
    };
  };

  // Reopens the panel on an answer already in the catalog: the rows arrive as
  // drafts that know which row each of them is editing.
  const adoptRecordedParty = useCallback((
    recorded: { diet: Diet; note: string },
    familyRows: { id: string; name: string; diet: Diet; isChildUnder2: boolean; needsHighChair: boolean }[],
  ): void => {
    setPrimaryDiet(recorded.diet);
    setNoteDraft(recorded.note);
    setFamilyDrafts(
      familyRows.slice(0, MAX_FAMILY_MEMBERS).map((row) => ({
        draftKey: row.id,
        persistedId: row.id,
        name: row.name,
        diet: row.diet,
        isChildUnder2: row.isChildUnder2,
        needsHighChair: row.needsHighChair,
      })),
    );
  }, []);

  const resetPartyDraft = (): void => {
    setPrimaryDiet(null);
    setFamilyDrafts([]);
    setNoteDraft('');
  };

  return {
    primaryDiet,
    setPrimaryDiet,
    familyDrafts,
    appendFamilyDraft,
    patchFamilyDraft,
    discardFamilyDraft,
    releaseFamilyPersistence,
    noteDraft,
    setNoteDraft,
    isSubmitting,
    setIsSubmitting,
    assemblePartyPayload,
    adoptRecordedParty,
    resetPartyDraft,
  };
};
