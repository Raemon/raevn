import type { GuestWithOptimistic } from './guestTypes';
import { HANDFASTING_GUESTS_ENDPOINT } from './handfastingGuestCatalogEndpoint';

// Posts JSON without repeating header wiring across optimistic flows.

const persistGuestProfileBody = async (enteredNameTrimmed: string): Promise<Response> =>
  fetch(HANDFASTING_GUESTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: enteredNameTrimmed }),
  });

// Throws when API declines so constellation logic can rewind confidently.

export const replyWithPersistedGuestRow = async (
  enteredNameTrimmed: string,
): Promise<GuestWithOptimistic> => {
  const acknowledgement = await persistGuestProfileBody(enteredNameTrimmed);
  if (!acknowledgement.ok) throw new Error(await acknowledgement.text());
  return (await acknowledgement.json()) as GuestWithOptimistic;
};
