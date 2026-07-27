import type { Dispatch, SetStateAction } from 'react';
import type { GuestWithOptimistic } from './guestTypes';
import type { PartyRegistrationPayload } from './partyRegistrationTypes';
import { buildOptimisticPartyPlaceholders } from './buildOptimisticGuestPlaceholder';
import { dropGuestRowsByIdentifiers, stitchAuthoritativePartyOverPlaceholders } from './guestRowTransforms';
import { replyWithPersistedPartyRows } from './replyWithPersistedPartyRows';

function appendTransientPartyGlow(
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
  placeholderRows: GuestWithOptimistic[],
): void {
  receiveGuestRows((beforeRows) => [...beforeRows, ...placeholderRows]);
}

// Swaps placeholders for Neon truth exactly where each attendee stood in line.

function confirmPartyPlaceholdersWithServerTruth(
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
  temporaryIdentifiers: string[],
  authoritativeRows: GuestWithOptimistic[],
): void {
  receiveGuestRows((beforeRows) =>
    stitchAuthoritativePartyOverPlaceholders(beforeRows, temporaryIdentifiers, authoritativeRows),
  );
}

// Drops optimistic dust if Postgres declined the inscription without drama;
// the server transaction is all-or-nothing, so the rewind is too.

function scrubFailedPartyPlaceholders(
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
  temporaryIdentifiers: string[],
): void {
  receiveGuestRows((beforeRows) => dropGuestRowsByIdentifiers(beforeRows, temporaryIdentifiers));
}

async function reconcileOrRewindTransientPartyGlow(
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
  temporaryIdentifiers: string[],
  party: PartyRegistrationPayload,
): Promise<GuestWithOptimistic[]> {
  try {
    const authoritativeRows = await replyWithPersistedPartyRows(party);
    confirmPartyPlaceholdersWithServerTruth(receiveGuestRows, temporaryIdentifiers, authoritativeRows);
    return authoritativeRows;
  } catch {
    scrubFailedPartyPlaceholders(receiveGuestRows, temporaryIdentifiers);
    throw new Error('Registration did not reach the catalog');
  }
}

// Binds submission + optimistic paint + persistence so tinkers tweak one cohesive story thread.
// Returns the persisted rows, primary first, so the panel can keep editing the
// registration it just made instead of posting a second one.

export const commitAssembledPartyAgainstConstellationCatalog = async (
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
  party: PartyRegistrationPayload,
): Promise<GuestWithOptimistic[]> => {
  if (party.rsvp !== true) {
    // Declining and undecided parties are recorded but never painted in the sky.
    return await replyWithPersistedPartyRows(party);
  }
  const { placeholderRows, temporaryIdentifiers } = buildOptimisticPartyPlaceholders(party);
  appendTransientPartyGlow(receiveGuestRows, placeholderRows);
  return await reconcileOrRewindTransientPartyGlow(receiveGuestRows, temporaryIdentifiers, party);
};
