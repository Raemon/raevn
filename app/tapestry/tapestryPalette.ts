import { createSeededRandom } from './tapestrySeededRandom';
import type { TapestrySide } from './tapestryTypes';

// Moonlit silver for Elizabeth's people, maroon for Ray's, candle cream for
// shared friends — all chosen to glow against the page's black ground. The
// maroons are lifted well off true oxblood: a real maroon is nearly invisible
// on black at name sizes, so these keep the wine cast and the legibility.
const SIDE_THREAD_COLORS: Record<TapestrySide, string[]> = {
  elizabeth: ['#aec1d8', '#8fa9c6', '#cfdbe9', '#7d97b8', '#bccde0'],
  ray: ['#bd5461', '#a84450', '#cf7b86', '#963a45', '#b26069'],
  both: ['#f1ece0', '#ded2b6', '#cfc3a6', '#e8dfc9'],
};

export const NAME_INK = '#f1ece0';
export const FAINT_INK = '#cbc4b3';
export const PAGE_BLACK = '#000000';

export const pickThreadColor = (side: TapestrySide, seedText: string): string => {
  const swatches = SIDE_THREAD_COLORS[side];
  const roll = createSeededRandom(`${seedText}::thread-color`)();
  return swatches[Math.floor(roll * swatches.length) % swatches.length];
};

export const truncateName = (name: string, maxCharacters: number): string =>
  name.length <= maxCharacters ? name : `${name.slice(0, maxCharacters - 1).trimEnd()}…`;
