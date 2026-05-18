import type { Dispatch, SetStateAction } from 'react';
import type { GuestWithOptimistic } from './guestTypes';
import { fetchAuthoritativeGuestRows } from './guestCatalogReaders';

// Shuts hydration down once patrons leave without waiting on slow networks.

function sealHydrationAgainstUnmount(mountLease: { open: boolean }): () => void {
  return (): void => { mountLease.open = false; };
}

// Applies rows only while the constellation surface still cares about updates.

async function hydrateWhileLeaseOpen(
  mountLease: { open: boolean },
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
): Promise<void> {
  const constellationRowsSnapshot = await fetchAuthoritativeGuestRows();
  if (!mountLease.open) return;
  receiveGuestRows(constellationRowsSnapshot);
}

// Mirrors how guests expect shared lists to load before they add their sparkle.

export const wireInitialGuestHydration = (
  receiveGuestRows: Dispatch<SetStateAction<GuestWithOptimistic[]>>,
): (() => void) => {
  const mountLease = { open: true };
  void hydrateWhileLeaseOpen(mountLease, receiveGuestRows);
  return sealHydrationAgainstUnmount(mountLease);
};
