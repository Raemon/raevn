import type { GuestWithOptimistic } from './guestTypes';
import { HANDFASTING_GUESTS_ENDPOINT } from './handfastingGuestCatalogEndpoint';

// Saves us from exploding when malformed JSON slips through CDN edges.
export const coerceGuestCatalogPayload = (payload: unknown): GuestWithOptimistic[] =>
  Array.isArray(payload) ? (payload as GuestWithOptimistic[]) : [];

// Streams response bytes into constellation rows once Prisma validates them.

const hydrateRowsFromHealthyResponse = async (
  catalogResponse: Response,
): Promise<GuestWithOptimistic[]> =>
  coerceGuestCatalogPayload(await catalogResponse.json());

// Wraps HTTP work so collapsing networks still resolve to empty sky.

async function probeCatalogResponseBody(): Promise<Response | null> {
  try {
    return await fetch(HANDFASTING_GUESTS_ENDPOINT);
  } catch {
    return null;
  }
}

async function reconcileCatalogHandshake(
  catalogResponseCandidate: Response | null,
): Promise<GuestWithOptimistic[]> {
  if (!catalogResponseCandidate?.ok) return [];
  return hydrateRowsFromHealthyResponse(catalogResponseCandidate);
}

// Pulls Neon truth on load so refreshed tabs reopen the shared constellation snapshot.

export const fetchAuthoritativeGuestRows = async (): Promise<GuestWithOptimistic[]> =>
  await reconcileCatalogHandshake(await probeCatalogResponseBody());
