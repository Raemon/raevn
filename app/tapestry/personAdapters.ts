import type { GuestWithOptimistic } from '../handfasting-simple/guest-constellation/guestTypes';
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
  guests.map((guest) => ({
    id: guest.id,
    name: guest.name,
    side: resolveSide(guest.invitee?.side, guest.registeredById ?? guest.id),
    familyKey: guest.registeredById ?? guest.id,
    hovertext: guest.registeredById ? null : guest.invitee?.diagramHovertext ?? null,
  }));

export const inviteeRowToTapestryPerson = (invitee: {
  id: string;
  name: string;
  side: string;
  diagramHovertext?: string | null;
}): TapestryPerson => ({
  id: invitee.id,
  name: invitee.name,
  side: resolveSide(invitee.side, invitee.id),
  familyKey: invitee.id,
  hovertext: invitee.diagramHovertext ?? null,
});
