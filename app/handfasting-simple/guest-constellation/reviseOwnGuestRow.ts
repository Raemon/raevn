import type { Diet } from '@prisma/client';
import type { GuestWithOptimistic } from './guestTypes';
import { HANDFASTING_GUESTS_ENDPOINT } from './handfastingGuestCatalogEndpoint';

// Edits to a registration that already exists. Since an RSVP is recorded on the
// click itself, everything after it — the note a guest keeps typing, a diet they
// change their mind about, a family member they remember — is an edit of rows
// that are already in the catalog rather than a fresh submission.

export type GuestRowRevision = {
  note?: string;
  diet?: Diet;
  name?: string;
  isChildUnder2?: boolean;
  needsHighChair?: boolean;
};

export const reviseOwnGuestRow = async (guestId: string, revision: GuestRowRevision): Promise<void> => {
  const acknowledgement = await fetch(`${HANDFASTING_GUESTS_ENDPOINT}/${guestId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(revision),
  });
  if (!acknowledgement.ok) throw new Error(await acknowledgement.text());
};

// Retires a row whose guest changed their mind — one family member, or an
// entire answer being replaced by the opposite one.
export const retireOwnGuestRow = async (guestId: string): Promise<void> => {
  const acknowledgement = await fetch(`${HANDFASTING_GUESTS_ENDPOINT}/${guestId}`, { method: 'DELETE' });
  if (!acknowledgement.ok) throw new Error(await acknowledgement.text());
};

export const addFamilyMemberToOwnRegistration = async (
  primaryGuestId: string,
  member: { name: string; diet: Diet; isChildUnder2: boolean; needsHighChair: boolean },
): Promise<GuestWithOptimistic> => {
  const acknowledgement = await fetch(`${HANDFASTING_GUESTS_ENDPOINT}/${primaryGuestId}/family`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(member),
  });
  if (!acknowledgement.ok) throw new Error(await acknowledgement.text());
  return (await acknowledgement.json()) as GuestWithOptimistic;
};

export type RecordedRegistration = { primary: GuestWithOptimistic; family: GuestWithOptimistic[] };

const readRegistrationFrom = async (url: string): Promise<RecordedRegistration | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const payload = (await response.json()) as { primary?: GuestWithOptimistic; family?: unknown } | null;
    if (!payload?.primary) return null;
    return { primary: payload.primary, family: Array.isArray(payload.family) ? payload.family : [] };
  } catch {
    return null;
  }
};

// Which row this browser last recorded an answer on. The cookie already
// answers this for a guest who came through their invite link; this is for the
// case it can't — an admin on the real page — and as a second chance when the
// invitee lookup itself fails.
const RECORDED_GUEST_ID_KEY = 'raevn.recordedGuestId';

export const rememberRecordedGuestId = (guestId: string | null): void => {
  try {
    if (guestId) window.localStorage.setItem(RECORDED_GUEST_ID_KEY, guestId);
    else window.localStorage.removeItem(RECORDED_GUEST_ID_KEY);
  } catch {
    // Private browsing and blocked storage just cost us the fallback.
  }
};

const recallRecordedGuestId = (): string | null => {
  try {
    return window.localStorage.getItem(RECORDED_GUEST_ID_KEY);
  } catch {
    return null;
  }
};

// The answer this browser already gave, so a reloaded page reopens on it. A
// failed read just means the panel starts from the buttons.
export const readOwnRegistration = async (): Promise<RecordedRegistration | null> => {
  const byInvitation = await readRegistrationFrom(`${HANDFASTING_GUESTS_ENDPOINT}/mine`);
  if (byInvitation) return byInvitation;
  const rememberedGuestId = recallRecordedGuestId();
  if (!rememberedGuestId) return null;
  const byRememberedId = await readRegistrationFrom(`${HANDFASTING_GUESTS_ENDPOINT}/${rememberedGuestId}`);
  // A row that is gone (or no longer ours) should stop being asked about.
  if (!byRememberedId) rememberRecordedGuestId(null);
  return byRememberedId;
};
