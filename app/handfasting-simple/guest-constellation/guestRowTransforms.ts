import type { GuestWithOptimistic } from './guestTypes';

// Removes failed attempts so the sky does not keep ghost names.

export const dropGuestRowByIdentifier = (
  rows: GuestWithOptimistic[],
  doomedIdentifier: string,
): GuestWithOptimistic[] =>
  rows.filter((row) => row.id !== doomedIdentifier);

// Pins the Neon truth onto the tentative slot without reordering siblings.

export const stitchAuthoritativeGuestOverPlaceholder = (
  rowsBeforeSwap: GuestWithOptimistic[],
  temporaryIdentifier: string,
  authoritativeRow: GuestWithOptimistic,
): GuestWithOptimistic[] =>
  rowsBeforeSwap.map((row) =>
    row.id === temporaryIdentifier ? { ...authoritativeRow, optimistic: false } : row,
  );
