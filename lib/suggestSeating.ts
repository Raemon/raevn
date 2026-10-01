import type { GuestAdminRow } from '@/app/admin/adminRowTypes';
import {
  emptyTable,
  ensureSpareTable,
  isSeatableGuest,
  namesMatch,
  SEATS_PER_TABLE,
  type SeatingTable,
} from './seatingChart';

// Partners who RSVP'd on separate forms, plus last-name households that the
// registration graph does not already glue together. Taylor is omitted on
// purpose: Shirley and Mia share a name and not a family.
const KNOWN_PARTNER_PAIRS: Array<[string, string]> = [
  ['Raymond Arnold', 'Elizabeth Van Nostrand'],
  ['Cody Wild', 'Andrew Richardson'],
  ['Chris (cbhacking)', 'Scy'],
  ['Oberon Dixon-Luinenburg', 'Tessa Alexanian'],
];

const LAST_NAMES_THAT_MEAN_FAMILY = new Set([
  'arnold',
  'van nostrand',
  'rettek',
  'zerrell',
  'mennen',
  'dixon',
  'hacking',
]);

// Seat order is left column 0–3, right column 4–7, so index i sits across
// from i+4. Couples are written as those pairs. Each table keeps a household
// or two together and then seats a different circle across from them, so
// nobody is surrounded only by strangers or only by people they already know.
const SUGGESTED_TABLE_NAMES: string[][] = [
  [
    'Raymond Arnold',
    'Mary Koniz Arnold',
    'Emily Arnold',
    'R. Craig Van Nostrand',
    'Elizabeth Van Nostrand',
    'Glenn Arnold',
    'Susan Deane-Miller',
    'Shirley Taylor',
  ],
  [
    'Andrew Rettek',
    'Simon Rettek',
    'Bruce Rettek',
    'Patrick LaVictoire',
    'Sarah Constantin',
    'Molly Rettek',
    'Vaniver Gray',
    '',
  ],
  [
    'Ruben Bloom',
    'Oberon Dixon-Luinenburg',
    'Iomedae Dixon-Bloom',
    '',
    'Miranda Dixon-Luinenburg',
    'Tessa Alexanian',
    'John Steidley',
    '',
  ],
  [
    'Rachel',
    'Melanie Zerrell',
    'Isabel Juniewicz',
    'Jasper Mennen',
    'Tim Zerrell',
    'Lydia Zerrell',
    'Alex Mennen',
    'Asrik',
  ],
  [
    'Oliver Habryka',
    'Ben Pace',
    'Eneasz Brodski',
    'Erica Edelman',
    'Asya Bergal',
    'Rafe Kennedy',
    'Jennifer Kesteloot',
    '',
  ],
  [
    'John Wentworth',
    'Eli Tyre',
    'Ben Landau-Taylor',
    '',
    'Daniel Filan',
    'Alex Altair',
    'Mattie Reyes',
    '',
  ],
  [
    'Cody Wild',
    'Chris (cbhacking)',
    'Elizabeth (EA)',
    'Aster Hacking',
    'Andrew Richardson',
    'Scy',
    'Caitlin Edwards-Appell',
    'Robert Mushkatblat',
  ],
  [
    'Milan Griffes',
    'Timothy Telleen-Lawton',
    'Elliot Jin',
    'Drake Thomas',
    'Evelyn McLean',
    'Kathleen Finlinson',
    'Mary',
    'George Wang',
  ],
  [
    'Ben Weinstein-Raun',
    'Anna Tchetchetkine',
    'Meera',
    'Joseph Schneider',
    'James Tillman',
    'Mia Taylor',
    'Tilia Bell',
    'Jasen Murray',
  ],
];

const lastNameKey = (name: string): string | null => {
  const stripped = name
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.includes('van nostrand')) return 'van nostrand';
  if (stripped.includes('dixon-luinenburg') || stripped.includes('dixon-bloom')) return 'dixon';
  const words = stripped.split(' ');
  if (words.length < 2) return null;
  const last = words[words.length - 1] ?? '';
  return LAST_NAMES_THAT_MEAN_FAMILY.has(last) ? last : null;
};

const findGuestByName = (unmatchedGuests: GuestAdminRow[], suggestedName: string): GuestAdminRow | null => {
  if (suggestedName.trim() === '') return null;
  for (const guest of unmatchedGuests) {
    if (namesMatch(guest.name, suggestedName)) return guest;
  }
  return null;
};

const partyRootOf = (parentById: Map<string, string>, guestId: string): string => {
  let current = parentById.get(guestId) ?? guestId;
  while (parentById.get(current) !== current) {
    current = parentById.get(current) ?? current;
  }
  return current;
};

const unionParties = (parentById: Map<string, string>, leftId: string, rightId: string) => {
  const leftRoot = partyRootOf(parentById, leftId);
  const rightRoot = partyRootOf(parentById, rightId);
  if (leftRoot !== rightRoot) parentById.set(leftRoot, rightRoot);
};

export const partyIdByGuestId = (guests: GuestAdminRow[]): Map<string, string> => {
  const parentById = new Map(guests.map((guest) => [guest.id, guest.id]));
  for (const guest of guests) {
    if (guest.registeredById && parentById.has(guest.registeredById)) {
      unionParties(parentById, guest.id, guest.registeredById);
    }
  }
  for (const [leftName, rightName] of KNOWN_PARTNER_PAIRS) {
    const leftGuest = findGuestByName(guests, leftName);
    const rightGuest = findGuestByName(guests, rightName);
    if (leftGuest && rightGuest) unionParties(parentById, leftGuest.id, rightGuest.id);
  }
  const guestsByLastName = new Map<string, GuestAdminRow[]>();
  for (const guest of guests) {
    const lastName = lastNameKey(guest.name);
    if (!lastName) continue;
    const familyMembers = guestsByLastName.get(lastName) ?? [];
    familyMembers.push(guest);
    guestsByLastName.set(lastName, familyMembers);
  }
  for (const familyMembers of guestsByLastName.values()) {
    const [familyHead, ...otherFamilyMembers] = familyMembers;
    if (!familyHead) continue;
    for (const familyMember of otherFamilyMembers) {
      unionParties(parentById, familyHead.id, familyMember.id);
    }
  }
  const roots = new Map<string, string>();
  for (const guest of guests) roots.set(guest.id, partyRootOf(parentById, guest.id));
  return roots;
};

const placePartyOnTables = (
  tables: SeatingTable[],
  partyMembers: GuestAdminRow[],
): SeatingTable[] => {
  const nextTables = tables.map((table) => ({ id: table.id, seats: [...table.seats] }));
  const remainingMembers = [...partyMembers];
  const tablesWithSpace = nextTables
    .map((table, tableIndex) => ({
      tableIndex,
      emptySeats: table.seats.filter((seat) => seat === null).length,
    }))
    .filter((entry) => entry.emptySeats > 0)
    .sort((left, right) => right.emptySeats - left.emptySeats);

  for (const tableEntry of tablesWithSpace) {
    if (remainingMembers.length === 0) break;
    const table = nextTables[tableEntry.tableIndex];
    if (!table) continue;
    table.seats.forEach((seat, seatIndex) => {
      if (seat !== null || remainingMembers.length === 0) return;
      const nextGuest = remainingMembers.shift();
      if (nextGuest) table.seats[seatIndex] = nextGuest.id;
    });
  }

  while (remainingMembers.length > 0) {
    const extraTable = emptyTable(`table-${nextTables.length + 1}`);
    extraTable.seats.forEach((seat, seatIndex) => {
      if (seat !== null || remainingMembers.length === 0) return;
      const nextGuest = remainingMembers.shift();
      if (nextGuest) extraTable.seats[seatIndex] = nextGuest.id;
    });
    nextTables.push(extraTable);
  }
  return nextTables;
};

export const suggestSeating = (guests: GuestAdminRow[]): SeatingTable[] => {
  const seatableGuests = guests.filter((guest) => isSeatableGuest(guest));
  const unmatchedGuests = [...seatableGuests];
  const tables: SeatingTable[] = SUGGESTED_TABLE_NAMES.map((tableNames, tableIndex) => {
    const seats: Array<string | null> = tableNames.map((suggestedName) => {
      const matchedGuest = findGuestByName(unmatchedGuests, suggestedName);
      if (!matchedGuest) return null;
      const unmatchedIndex = unmatchedGuests.findIndex((guest) => guest.id === matchedGuest.id);
      if (unmatchedIndex >= 0) unmatchedGuests.splice(unmatchedIndex, 1);
      return matchedGuest.id;
    });
    while (seats.length < SEATS_PER_TABLE) seats.push(null);
    return { id: `table-${tableIndex + 1}`, seats: seats.slice(0, SEATS_PER_TABLE) };
  });

  const partyIds = partyIdByGuestId(unmatchedGuests);
  const leftoverParties = new Map<string, GuestAdminRow[]>();
  for (const leftoverGuest of unmatchedGuests) {
    const partyId = partyIds.get(leftoverGuest.id) ?? leftoverGuest.id;
    const partyMembers = leftoverParties.get(partyId) ?? [];
    partyMembers.push(leftoverGuest);
    leftoverParties.set(partyId, partyMembers);
  }
  const leftoverPartyGroups = [...leftoverParties.values()].sort(
    (leftParty, rightParty) => rightParty.length - leftParty.length,
  );

  let nextTables = tables;
  for (const leftoverParty of leftoverPartyGroups) {
    nextTables = placePartyOnTables(nextTables, leftoverParty);
  }
  return ensureSpareTable(nextTables);
};

export const partyColorForKey = (partyId: string): string => {
  const partyColors = [
    '#7a5a1c',
    '#2f6b33',
    '#3d5a8a',
    '#a33a3a',
    '#6b4c7a',
    '#2f6a62',
    '#8a5a32',
    '#5a5a6b',
    '#7a3f55',
    '#4a6b3d',
  ];
  let hash = 0;
  for (const character of partyId) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return partyColors[Math.abs(hash) % partyColors.length] ?? partyColors[0];
};
