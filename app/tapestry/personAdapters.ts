import type { GuestWithOptimistic } from '../handfasting-simple/guest-constellation/guestTypes';
import { resolveSideBlend } from '@/lib/sideBlend';
import { hashStringToSeed } from './tapestrySeededRandom';
import type { TapestryPerson, TapestrySide } from './tapestryTypes';

const isKnownSide = (side: string | null | undefined): side is TapestrySide =>
  side === 'elizabeth' || side === 'ray' || side === 'both';

// Guests who registered without a tokenized invite link carry no side, so
// they get a deterministic coin flip — stable across renders, and roughly
// balancing the two halves of the composition.
const resolveSide = (side: string | null | undefined, seedText: string): TapestrySide => {
  if (isKnownSide(side)) return side;
  return hashStringToSeed(`${seedText}::side`) % 2 === 0 ? 'elizabeth' : 'ray';
};

export const guestsToTapestryPersons = (guests: GuestWithOptimistic[]): TapestryPerson[] =>
  guests.map((guest) => {
    const side = resolveSide(guest.invitee?.side, guest.registeredById ?? guest.id);
    return {
      id: guest.id,
      name: guest.name,
      side,
      sideBlend: resolveSideBlend(guest.invitee?.sideBlend, guest.invitee?.side ?? side),
      familyKey: guest.registeredById ?? guest.id,
      hovertext: guest.registeredById ? null : guest.invitee?.diagramHovertext ?? null,
    };
  });

export const inviteeRowToTapestryPerson = (invitee: {
  id: string;
  name: string;
  side: string;
  sideBlend?: number | null;
  diagramHovertext?: string | null;
}): TapestryPerson => ({
  id: invitee.id,
  name: invitee.name,
  side: resolveSide(invitee.side, invitee.id),
  sideBlend: resolveSideBlend(invitee.sideBlend, invitee.side),
  familyKey: invitee.id,
  hovertext: invitee.diagramHovertext ?? null,
});
