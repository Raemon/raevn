import type { TapestryPerson, TapestrySide } from '../tapestry/tapestryTypes';

// Stand-in guest list so /preview still renders a full composition when the
// database is unreachable or the invite list hasn't been seeded yet.
const SAMPLE_ROWS: Array<[string, TapestrySide, string?]> = [
  ['Miriam Voss', 'elizabeth'],
  ['Theo Voss', 'elizabeth', 'Miriam Voss'],
  ['Juniper Hale', 'elizabeth'],
  ['Anselm Grey', 'elizabeth'],
  ['Odette Grey', 'elizabeth', 'Anselm Grey'],
  ['Petra Lindqvist', 'elizabeth'],
  ['Sable Marchetti', 'elizabeth'],
  ['Ilse Marchetti', 'elizabeth', 'Sable Marchetti'],
  ['Corin Ashby', 'elizabeth'],
  ['Wren Calloway', 'elizabeth'],
  ['Beatrix Lowell', 'elizabeth'],
  ['Hollis Lowell', 'elizabeth', 'Beatrix Lowell'],
  ['Maren Oduya', 'elizabeth'],
  ['Cleo Fairbanks', 'elizabeth'],
  ['Sylvie Andrade', 'elizabeth'],
  ['Nadia Kessler', 'elizabeth'],
  ['Tamsin Reyes', 'elizabeth'],
  ['Iris Whitfield', 'elizabeth'],
  ['Elowen Frost', 'elizabeth'],
  ['Greta Solberg', 'elizabeth'],
  ['Dorian Vale', 'ray'],
  ['Casper Nightingale', 'ray'],
  ['Rooke Emberly', 'ray'],
  ['Lena Emberly', 'ray', 'Rooke Emberly'],
  ['Felix Harrow', 'ray'],
  ['August Pinewood', 'ray'],
  ['Silas Thornbury', 'ray'],
  ['Mara Thornbury', 'ray', 'Silas Thornbury'],
  ['Ezra Coldwater', 'ray'],
  ['Jonas Wilder', 'ray'],
  ['Selene Wilder', 'ray', 'Jonas Wilder'],
  ['Bram Hollowell', 'ray'],
  ['Ash Riverton', 'ray'],
  ['Leif Sundstrom', 'ray'],
  ['Nico Aldermane', 'ray'],
  ['Ronan Blakely', 'ray'],
  ['Malachi Dunmore', 'ray'],
  ['Orin Castellan', 'ray'],
  ['Hugo Larkspur', 'ray'],
  ['Emrys Fowler', 'ray'],
  ['Sage Winterbourne', 'both'],
  ['River Winterbourne', 'both', 'Sage Winterbourne'],
  ['Noa Bellamy', 'both'],
  ['Kit Marlowe', 'both'],
  ['Ariel Dovetail', 'both'],
  ['Rowan Ellery', 'both'],
  ['Phoenix Amara', 'both'],
  ['Indigo Hartwell', 'both'],
  ['Lux Meridian', 'both'],
  ['Story Alcott', 'both'],
];

export const buildSampleGuestList = (): TapestryPerson[] => {
  const idsByName = new Map<string, string>();
  SAMPLE_ROWS.forEach(([name], index) => idsByName.set(name, `sample-${index}-${name}`));
  return SAMPLE_ROWS.map(([name, side, householdHead]) => ({
    id: idsByName.get(name)!,
    name,
    side,
    familyKey: (householdHead && idsByName.get(householdHead)) || idsByName.get(name)!,
  }));
};
