import type { GuestWithOptimistic } from './guestTypes';
import type { PartyRegistrationPayload } from './partyRegistrationTypes';
import { HANDFASTING_GUESTS_ENDPOINT } from './handfastingGuestCatalogEndpoint';

// Posts JSON without repeating header wiring across optimistic flows.

const persistPartyRegistrationBody = async (party: PartyRegistrationPayload): Promise<Response> =>
  fetch(HANDFASTING_GUESTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(party),
  });

// Throws when API declines so constellation logic can rewind confidently.

export const replyWithPersistedPartyRows = async (
  party: PartyRegistrationPayload,
): Promise<GuestWithOptimistic[]> => {
  const acknowledgement = await persistPartyRegistrationBody(party);
  if (!acknowledgement.ok) throw new Error(await acknowledgement.text());
  return (await acknowledgement.json()) as GuestWithOptimistic[];
};
