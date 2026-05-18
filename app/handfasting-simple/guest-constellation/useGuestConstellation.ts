'use client';

import { useCallback, useEffect, useState } from 'react';
import { commitEnteredGuestNameAgainstConstellationCatalog } from './commitEnteredGuestNameAgainstConstellationCatalog';
import type { GuestWithOptimistic } from './guestTypes';
import { wireInitialGuestHydration } from './wireInitialGuestHydration';

// Bundles hydrate + RSVP wiring so constellation UI reads as one living sky.

export const useGuestConstellation = () => {
  const [guests, setGuests] = useState<GuestWithOptimistic[]>([]);
  useEffect(() => wireInitialGuestHydration(setGuests), []);
  const persistGuestThroughConstellationCatalog = useCallback(
    (enteredNameTrimmed: string): Promise<void> =>
      commitEnteredGuestNameAgainstConstellationCatalog(setGuests, enteredNameTrimmed),
    [],
  );
  return { guests, persistGuestThroughConstellationCatalog };
};
