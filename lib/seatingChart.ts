import type { GuestAdminRow } from '@/app/admin/adminRowTypes';

export const SEATS_PER_TABLE = 8;
export const SEATING_CHART_SETTING_KEY = 'seatingChart';

export type SeatingTable = {
  id: string;
  seats: Array<string | null>;
};

export type SeatingChartPayload = {
  tables: SeatingTable[];
};

const HOST_NAME_KEYS = new Set(['raymond arnold', 'elizabeth van nostrand']);

export const nameAliases = (name: string): string[] => {
  const trimmed = name.trim().toLowerCase().replace(/\s+/g, ' ');
  const withoutParens = trimmed.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const aliases = [trimmed];
  if (withoutParens !== '' && withoutParens !== trimmed) aliases.push(withoutParens);
  return aliases;
};

export const namesMatch = (left: string, right: string): boolean => {
  const leftAliases = nameAliases(left);
  const rightAliases = nameAliases(right);
  for (const leftAlias of leftAliases) {
    for (const rightAlias of rightAliases) {
      if (leftAlias === rightAlias) return true;
    }
  }
  return false;
};

export const isHostGuest = (guest: Pick<GuestAdminRow, 'name'>): boolean =>
  nameAliases(guest.name).some((alias) => HOST_NAME_KEYS.has(alias));

export const isSeatableGuest = (guest: GuestAdminRow): boolean =>
  guest.rsvp === true || isHostGuest(guest);

export const selectSeatableGuests = (guests: GuestAdminRow[]): GuestAdminRow[] =>
  guests.filter((guest) => isSeatableGuest(guest));

export const emptyTable = (id: string): SeatingTable => ({
  id,
  seats: Array.from({ length: SEATS_PER_TABLE }, () => null),
});

export const parseSeatingChart = (raw: string | null | undefined): SeatingTable[] | null => {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<SeatingChartPayload>;
  if (!Array.isArray(parsed.tables)) return null;
  const tables: SeatingTable[] = [];
  for (const table of parsed.tables) {
    if (!table || typeof table.id !== 'string' || !Array.isArray(table.seats)) continue;
    const seats = table.seats.slice(0, SEATS_PER_TABLE).map((seat) =>
      typeof seat === 'string' && seat.trim() !== '' ? seat : null,
    );
    while (seats.length < SEATS_PER_TABLE) seats.push(null);
    tables.push({ id: table.id, seats });
  }
  return tables.length > 0 ? tables : null;
};

export const serializeSeatingChart = (tables: SeatingTable[]): string =>
  JSON.stringify({ tables });

export const seatedGuestIds = (tables: SeatingTable[]): Set<string> => {
  const ids = new Set<string>();
  for (const table of tables) {
    for (const seat of table.seats) {
      if (seat) ids.add(seat);
    }
  }
  return ids;
};

export const reconcileSeatingTables = (
  tables: SeatingTable[],
  seatableGuestIds: Set<string>,
): SeatingTable[] => {
  const seenGuestIds = new Set<string>();
  const nextTables = tables.map((table) => ({
    id: table.id,
    seats: table.seats.map((seat) => {
      if (!seat || !seatableGuestIds.has(seat) || seenGuestIds.has(seat)) return null;
      seenGuestIds.add(seat);
      return seat;
    }),
  }));
  return ensureSpareTable(nextTables);
};

export const ensureSpareTable = (tables: SeatingTable[]): SeatingTable[] => {
  const hasEmptySeat = tables.some((table) => table.seats.includes(null));
  if (hasEmptySeat) return tables;
  return [...tables, emptyTable(`table-${tables.length + 1}`)];
};

export const moveGuestToSeat = (
  tables: SeatingTable[],
  guestId: string,
  toTableIndex: number,
  toSeatIndex: number,
): SeatingTable[] => {
  const nextTables = tables.map((table) => ({ id: table.id, seats: [...table.seats] }));
  let fromTableIndex = -1;
  let fromSeatIndex = -1;
  nextTables.forEach((table, tableIndex) => {
    table.seats.forEach((seat, seatIndex) => {
      if (seat === guestId) {
        fromTableIndex = tableIndex;
        fromSeatIndex = seatIndex;
      }
    });
  });
  const targetSeat = nextTables[toTableIndex]?.seats[toSeatIndex];
  if (targetSeat === undefined) return tables;
  if (fromTableIndex >= 0) nextTables[fromTableIndex].seats[fromSeatIndex] = targetSeat ?? null;
  nextTables[toTableIndex].seats[toSeatIndex] = guestId;
  return ensureSpareTable(nextTables);
};

export const unseatGuest = (tables: SeatingTable[], guestId: string): SeatingTable[] => {
  const nextTables = tables.map((table) => ({
    id: table.id,
    seats: table.seats.map((seat) => (seat === guestId ? null : seat)),
  }));
  return ensureSpareTable(nextTables);
};
