import type { Diet } from '@prisma/client';
import type { PartyRegistrationPayload } from '@/app/handfasting-simple/guest-constellation/partyRegistrationTypes';
import { MAX_FAMILY_MEMBERS, MAX_GUEST_NAME_LENGTH } from '@/app/handfasting-simple/guest-constellation/partyLimits';

const DIET_ALLOWLIST = new Set<string>(['omnivore', 'vegetarian', 'vegan']);

const sanitizeName = (candidate: unknown): string =>
  typeof candidate === 'string' ? candidate.trim().slice(0, MAX_GUEST_NAME_LENGTH) : '';

const sanitizeDiet = (candidate: unknown): Diet =>
  typeof candidate === 'string' && DIET_ALLOWLIST.has(candidate) ? (candidate as Diet) : 'omnivore';

// null = undecided; anything that isn't literally true/false stays undecided.
const sanitizeRsvp = (candidate: unknown): boolean | null =>
  candidate === true ? true : candidate === false ? false : null;

// Returns null when the primary name is missing; legacy {name}-only bodies
// still parse (solo omnivore, undecided rsvp, no family).
export const parsePartyRegistrationBody = (body: unknown): PartyRegistrationPayload | null => {
  const record = body as {
    name?: unknown;
    diet?: unknown;
    rsvp?: unknown;
    inviteToken?: unknown;
    family?: unknown;
  } | null;
  const name = sanitizeName(record?.name);
  if (!name) return null;
  const rawFamily = Array.isArray(record?.family) ? record.family : [];
  const family = rawFamily
    .slice(0, MAX_FAMILY_MEMBERS)
    .map((entry) => {
      const member = entry as {
        name?: unknown;
        diet?: unknown;
        isChildUnder2?: unknown;
        needsHighChair?: unknown;
      } | null;
      return {
        name: sanitizeName(member?.name),
        diet: sanitizeDiet(member?.diet),
        isChildUnder2: member?.isChildUnder2 === true,
        needsHighChair: member?.needsHighChair === true,
      };
    })
    .filter((member) => member.name !== '');
  return {
    name,
    diet: sanitizeDiet(record?.diet),
    rsvp: sanitizeRsvp(record?.rsvp),
    ...(typeof record?.inviteToken === 'string' && record.inviteToken !== ''
      ? { inviteToken: record.inviteToken }
      : {}),
    family,
  };
};
