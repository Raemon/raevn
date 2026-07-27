'use client';

import { useCallback, useEffect, useState } from 'react';
import { commitAssembledPartyAgainstConstellationCatalog } from './commitAssembledPartyAgainstConstellationCatalog';
import type { GuestWithOptimistic } from './guestTypes';
import type { PartyRegistrationPayload } from './partyRegistrationTypes';
import { retireOwnGuestRow } from './reviseOwnGuestRow';
import { wireInitialGuestHydration } from './wireInitialGuestHydration';
import type { InviteeTapestryHint } from '../../tapestry/tapestryTypes';

// Bundles hydrate + RSVP wiring so constellation UI reads as one living sky.

export const useGuestConstellation = (inviteeTapestryHint?: InviteeTapestryHint) => {
  const [guests, setGuests] = useState<GuestWithOptimistic[]>([]);
  const [celebratedPrimaryId, setCelebratedPrimaryId] = useState<string | null>(null);
  useEffect(() => wireInitialGuestHydration(setGuests), []);
  useEffect(() => {
    if (!celebratedPrimaryId) return;
    const dismissTimer = setTimeout(() => setCelebratedPrimaryId(null), 8000);
    return () => clearTimeout(dismissTimer);
  }, [celebratedPrimaryId]);
  const persistGuestThroughConstellationCatalog = useCallback(
    (party: PartyRegistrationPayload): Promise<GuestWithOptimistic[]> =>
      commitAssembledPartyAgainstConstellationCatalog(setGuests, party, {
        inviteeTapestryHint,
        onPrimaryArrival: setCelebratedPrimaryId,
      }),
    [inviteeTapestryHint],
  );
  // Retiring a registration the guest replaced: the row leaves the sky here as
  // well as the database, so an accept-then-decline doesn't leave a star behind.
  const retireGuestFromConstellation = useCallback(async (guestId: string): Promise<void> => {
    await retireOwnGuestRow(guestId);
    setGuests((rows) => rows.filter((row) => row.id !== guestId && row.registeredById !== guestId));
    setCelebratedPrimaryId((celebratedId) => (celebratedId === guestId ? null : celebratedId));
  }, []);
  return {
    guests,
    celebratedPrimaryId,
    persistGuestThroughConstellationCatalog,
    retireGuestFromConstellation,
  };
};
