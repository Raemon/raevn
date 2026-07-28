import type { TapestryPerson, TapestrySide } from './tapestryTypes';

export type TapestryFamily = {
  familyKey: string;
  side: TapestrySide;
  members: TapestryPerson[];
};

const SIDE_SEQUENCE: Record<TapestrySide, number> = { elizabeth: 0, both: 1, ray: 2 };

// Families stay contiguous (a household reads as one cluster) and sides stay
// contiguous (elizabeth → both → ray) so every arrangement can carve the
// ordered list into side sectors by simple slicing.
export const groupIntoFamilies = (persons: TapestryPerson[]): TapestryFamily[] => {
  const familiesByKey = new Map<string, TapestryFamily>();
  for (const person of persons) {
    const existing = familiesByKey.get(person.familyKey);
    if (existing) {
      existing.members.push(person);
    } else {
      familiesByKey.set(person.familyKey, {
        familyKey: person.familyKey,
        side: person.side,
        members: [person],
      });
    }
  }
  return [...familiesByKey.values()].sort(
    (a, b) =>
      (a.members[0]?.sideBlend ?? 0.5) - (b.members[0]?.sideBlend ?? 0.5) ||
      a.familyKey.localeCompare(b.familyKey),
  );
};

export const orderPersonsForTapestry = (persons: TapestryPerson[]): TapestryPerson[] =>
  groupIntoFamilies(persons).flatMap((family) => family.members);

export const splitBySide = (
  persons: TapestryPerson[],
): Record<TapestrySide, TapestryPerson[]> => {
  const bySide: Record<TapestrySide, TapestryPerson[]> = { elizabeth: [], both: [], ray: [] };
  for (const person of orderPersonsForTapestry(persons)) {
    bySide[person.side].push(person);
  }
  return bySide;
};
