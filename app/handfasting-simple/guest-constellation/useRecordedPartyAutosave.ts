'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Diet } from '@prisma/client';
import type { FamilyMemberDraft } from './partyRegistrationTypes';
import { addFamilyMemberToOwnRegistration, reviseOwnGuestRow } from './reviseOwnGuestRow';

// Nobody registers separately from RSVPing any more: the answer is recorded on
// the click, and everything the panel shows afterwards edits those rows. This
// hook is the thing that keeps them true — it watches the drafts, saves what
// changed a beat after the guest stops fiddling, and reports what it's doing so
// the panel can say so out loud.

export type PartyAutosaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

// Long enough not to fire mid-word, short enough that a guest who types and
// closes the tab has almost certainly been saved.
const AUTOSAVE_QUIET_MS = 700;

const describeFamilyDraft = (draft: FamilyMemberDraft) => ({
  name: draft.name.trim(),
  diet: draft.diet,
  isChildUnder2: draft.isChildUnder2,
  needsHighChair: draft.needsHighChair,
});

// A decline eats nothing, so it has nothing on the primary row to keep in
// sync. The note is not here on purpose: it is a piece of writing, and it
// saves when its author says so.
const describePrimary = (isAttending: boolean, diet: Diet): string | null =>
  isAttending ? JSON.stringify({ diet }) : null;

export const useRecordedPartyAutosave = ({
  recordedGuestId,
  isAttending,
  diet,
  familyDrafts,
  markFamilyDraftPersisted,
}: {
  recordedGuestId: string | null;
  isAttending: boolean;
  diet: Diet;
  familyDrafts: FamilyMemberDraft[];
  markFamilyDraftPersisted: (draftKey: string, persistedId: string) => void;
}) => {
  const [status, setStatus] = useState<PartyAutosaveStatus>('idle');
  // What the server is believed to hold, so an edit that changes nothing —
  // including the one that comes straight back from recording the answer —
  // costs no request.
  const savedPrimaryRef = useRef<string | null>(null);
  const savedFamilyRef = useRef(new Map<string, string>());
  // Family rows being created right now: their draft has no id yet, so without
  // this the next keystroke would start a second create for the same person.
  const creatingDraftKeysRef = useRef(new Set<string>());

  const seedAutosaveBaseline = useCallback(
    (
      recorded: { isAttending: boolean; diet: Diet } | null,
      familyRows: { id: string; name: string; diet: Diet; isChildUnder2: boolean; needsHighChair: boolean }[],
    ) => {
      savedPrimaryRef.current = recorded
        ? describePrimary(recorded.isAttending, recorded.diet)
        : null;
      savedFamilyRef.current = new Map(
        familyRows.map((row) => [
          row.id,
          JSON.stringify({
            name: row.name.trim(),
            diet: row.diet,
            isChildUnder2: row.isChildUnder2,
            needsHighChair: row.needsHighChair,
          }),
        ]),
      );
      creatingDraftKeysRef.current.clear();
      setStatus('idle');
    },
    [],
  );

  useEffect(() => {
    if (!recordedGuestId) return;
    const primarySnapshot = describePrimary(isAttending, diet);
    const isPrimaryDirty = primarySnapshot !== null && savedPrimaryRef.current !== primarySnapshot;
    const dirtyFamily = isAttending
      ? familyDrafts
          .filter((draft) => draft.name.trim() !== '')
          .map((draft) => ({ draft, snapshot: JSON.stringify(describeFamilyDraft(draft)) }))
          .filter(({ draft, snapshot }) =>
            draft.persistedId
              ? savedFamilyRef.current.get(draft.persistedId) !== snapshot
              : !creatingDraftKeysRef.current.has(draft.draftKey),
          )
      : [];
    if (!isPrimaryDirty && dirtyFamily.length === 0) return;
    const autosaveTimer = setTimeout(async () => {
      setStatus('saving');
      try {
        if (isPrimaryDirty) {
          await reviseOwnGuestRow(recordedGuestId, { diet });
          savedPrimaryRef.current = primarySnapshot;
        }
        for (const { draft, snapshot } of dirtyFamily) {
          const member = describeFamilyDraft(draft);
          if (draft.persistedId) {
            await reviseOwnGuestRow(draft.persistedId, member);
            savedFamilyRef.current.set(draft.persistedId, snapshot);
            continue;
          }
          creatingDraftKeysRef.current.add(draft.draftKey);
          try {
            const createdRow = await addFamilyMemberToOwnRegistration(recordedGuestId, member);
            savedFamilyRef.current.set(createdRow.id, snapshot);
            markFamilyDraftPersisted(draft.draftKey, createdRow.id);
          } finally {
            creatingDraftKeysRef.current.delete(draft.draftKey);
          }
        }
        setStatus('saved');
      } catch {
        // The drafts on screen stay as the guest left them, and the next edit
        // finds them still dirty and tries again.
        setStatus('failed');
      }
    }, AUTOSAVE_QUIET_MS);
    return () => clearTimeout(autosaveTimer);
  }, [recordedGuestId, isAttending, diet, familyDrafts, markFamilyDraftPersisted]);

  // seedAutosaveBaseline is called after an answer is recorded or hydrated, so
  // the first sync after that has nothing to say.
  return { autosaveStatus: status, seedAutosaveBaseline };
};
