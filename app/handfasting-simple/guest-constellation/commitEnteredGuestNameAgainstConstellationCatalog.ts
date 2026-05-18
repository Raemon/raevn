import type { Dispatch, SetStateAction } from 'react';
import type { GuestWithOptimistic } from './guestTypes';
import { buildOptimisticGuestPlaceholder } from './buildOptimisticGuestPlaceholder';
import { dropGuestRowByIdentifier, stitchAuthoritativeGuestOverPlaceholder } from './guestRowTransforms';
import { replyWithPersistedGuestRow } from './replyWithPersistedGuestRow';
import { issueTemporaryGuestIdentity } from './issueTemporaryGuestIdentity';

function appendTransientGuestGlow(
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
  placeholderRow: GuestWithOptimistic,
): void {
  receiveGuestRows((beforeRows) => [...beforeRows, placeholderRow]);
}

// Swaps placeholders for Neon truth exactly where the attendee stood in line.

function confirmGuestPlaceholderWithServerTruth(
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
  temporaryIdentifier: string,
  authoritativeGuestRow: GuestWithOptimistic,
): void {
  receiveGuestRows((beforeRows) =>
    stitchAuthoritativeGuestOverPlaceholder(beforeRows, temporaryIdentifier, authoritativeGuestRow),
  );
}

// Drops optimistic dust if Postgres declined the inscription without drama.

function scrubFailedGuestPlaceholderById(
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
  temporaryIdentifier: string,
): void {
  receiveGuestRows((beforeRows) => dropGuestRowByIdentifier(beforeRows, temporaryIdentifier));
}

async function reconcileGuestPlaceholderAgainstApi(
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
  temporaryIdentifier: string,
  enteredNameTrimmed: string,
): Promise<void> {
  const authoritativeGuestRow = await replyWithPersistedGuestRow(enteredNameTrimmed);
  confirmGuestPlaceholderWithServerTruth(receiveGuestRows, temporaryIdentifier, authoritativeGuestRow);
}

// Guards the awaited API branch so failures unwind to the optimistic snapshot baseline.

async function reconcileOrRewindTransientGuestGlow(
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
  temporaryIdentifier: string,
  enteredNameTrimmed: string,
): Promise<void> {
  try {
    await reconcileGuestPlaceholderAgainstApi(receiveGuestRows, temporaryIdentifier, enteredNameTrimmed);
  } catch {
    scrubFailedGuestPlaceholderById(receiveGuestRows, temporaryIdentifier);
  }
}

// Binds typing + optimistic paint + persistence so tinkers tweak one cohesive story thread.

export const commitEnteredGuestNameAgainstConstellationCatalog = async (
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
  enteredNameTrimmed: string,
): Promise<void> => {
  const temporaryIdentifier = issueTemporaryGuestIdentity();
  appendTransientGuestGlow(
    receiveGuestRows,
    buildOptimisticGuestPlaceholder(enteredNameTrimmed, temporaryIdentifier),
  );
  await reconcileOrRewindTransientGuestGlow(receiveGuestRows, temporaryIdentifier, enteredNameTrimmed);
};
