'use client';

import { useCallback, useEffect, useState } from 'react';
import { commitAssembledPartyAgainstConstellationCatalog } from './commitAssembledPartyAgainstConstellationCatalog';
import type { GuestWithOptimistic } from './guestTypes';
import type { PartyRegistrationPayload } from './partyRegistrationTypes';
import { wireInitialGuestHydration } from './wireInitialGuestHydration';

// Bundles hydrate + RSVP wiring so constellation UI reads as one living sky.

export const useGuestConstellation = () => {
  const [guests, setGuests] = useState<GuestWithOptimistic[]>([]);
  useEffect(() => wireInitialGuestHydration(setGuests), []);
  const persistGuestThroughConstellationCatalog = useCallback(
    (party: PartyRegistrationPayload): Promise<void> =>
      commitAssembledPartyAgainstConstellationCatalog(setGuests, party),
    [],
  );
  return { guests, persistGuestThroughConstellationCatalog };
};
