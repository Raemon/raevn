'use client';

import { useCallback, useEffect, useState } from 'react';
import { commitAssembledPartyAgainstConstellationCatalog } from './commitAssembledPartyAgainstConstellationCatalog';
import type { GuestWithOptimistic } from './guestTypes';
import type { PartyRegistrationPayload } from './partyRegistrationTypes';
import { retireOwnGuestRow } from './reviseOwnGuestRow';
import { wireInitialGuestHydration } from './wireInitialGuestHydration';

// Bundles hydrate + RSVP wiring so constellation UI reads as one living sky.

export const useGuestConstellation = () => {
  const [guests, setGuests] = useState<GuestWithOptimistic[]>([]);
  useEffect(() => wireInitialGuestHydration(setGuests), []);
  const persistGuestThroughConstellationCatalog = useCallback(
    (party: PartyRegistrationPayload): Promise<GuestWithOptimistic[]> =>
      commitAssembledPartyAgainstConstellationCatalog(setGuests, party),
    [],
  );
  // Retiring a registration the guest replaced: the row leaves the sky here as
  // well as the database, so an accept-then-decline doesn't leave a star behind.
  const retireGuestFromConstellation = useCallback(async (guestId: string): Promise<void> => {
    await retireOwnGuestRow(guestId);
    setGuests((rows) => rows.filter((row) => row.id !== guestId && row.registeredById !== guestId));
  }, []);
  return { guests, persistGuestThroughConstellationCatalog, retireGuestFromConstellation };
};
