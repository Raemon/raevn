import type { GuestWithOptimistic } from './guestTypes';

// Removes failed attempts so the sky does not keep ghost names.

export const dropGuestRowsByIdentifiers = (
  rows: GuestWithOptimistic[],
  doomedIdentifiers: string[],
): GuestWithOptimistic[] => {
  const doomed = new Set(doomedIdentifiers);
  return rows.filter((row) => !doomed.has(row.id));
};

// Pins the Neon truth onto each tentative slot without reordering siblings;
// placeholders the server somehow didn't echo back simply dissolve.

export const stitchAuthoritativePartyOverPlaceholders = (
  rowsBeforeSwap: GuestWithOptimistic[],
  temporaryIdentifiers: string[],
  authoritativeRows: GuestWithOptimistic[],
): GuestWithOptimistic[] => {
  const swapByTemporaryId = new Map(
    temporaryIdentifiers.map((temporaryId, memberIndex) => [temporaryId, authoritativeRows[memberIndex]]),
  );
  return rowsBeforeSwap.flatMap((row) => {
    if (!swapByTemporaryId.has(row.id)) return [row];
    const authoritativeRow = swapByTemporaryId.get(row.id);
    return authoritativeRow ? [{ ...authoritativeRow, optimistic: false }] : [];
  });
};
