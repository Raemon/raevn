import { PALETTE } from './treeTuning';
import { createSeededRandom } from './tapestrySeededRandom';
import type { TapestrySide } from './tapestryTypes';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const mixHex = (from: string, to: string, t: number) => {
  const channel = (hex: string, offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  const blended = [1, 3, 5].map((offset) =>
    Math.round(lerp(channel(from, offset), channel(to, offset), t))
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${blended.join('')}`;
};

// How far across from cream to a side's own colour a point at x sits. Full
// colour is reached well inside the half span and the exponent leaves the
// centre quickly, so cream is a seam down the middle of the tree rather than
// the colour most of the crown is painted in.
const spectrumMixAt = (x: number, centerX: number, halfSpan: number): number => {
  const reach = Math.abs(x - centerX) / (halfSpan * PALETTE.spectrumFullAt);
  return Math.pow(Math.min(1, reach), PALETTE.spectrumEase);
};

// Blue on Elizabeth's side, maroon on Ray's, brightening to cream at the centre.
export const spectrumColorAt = (x: number, centerX: number, halfSpan: number): string => {
  const side = x <= centerX ? PALETTE.elizabeth : PALETTE.raymond;
  return mixHex(PALETTE.spectrumCenter, side, spectrumMixAt(x, centerX, halfSpan));
};

// Darkened spectrum for strand ends — names stay at full spectrumColorAt.
export const spectrumStrandEdgeAt = (
  x: number,
  centerX: number,
  halfSpan: number,
  edge: 'root' | 'tip',
): string => {
  const hue = spectrumColorAt(x, centerX, halfSpan);
  if (edge === 'root') return mixHex(hue, PALETTE.cordRootShade, PALETTE.strandRootDarken);
  return mixHex(hue, PALETTE.twigTip, PALETTE.twigFade);
};

// Leaves read a shade darker than their own name — mixed toward the same
// dark shade cord roots use, short of the strand-tip darkening.
export const leafFillColorFor = (color: string): string =>
  mixHex(color, PALETTE.cordRootShade, PALETTE.leafDarken);

// Where a strand passes through the trunk. It used to pass through pure cream,
// which painted the trunk white however its two halves were coloured.
export const spectrumStrandMidAt = (x: number, centerX: number, halfSpan: number): string =>
  mixHex(spectrumColorAt(x, centerX, halfSpan), PALETTE.spectrumCenter, PALETTE.threadCenterLift);

// A cord carries its owner's colour the whole way rather than reading it off
// the spectrum: both roots sit close enough to the trunk that the spectrum
// would hand them the cream centre, which is what bleached the braid.
export const cordRootColorFor = (color: string): string =>
  mixHex(color, PALETTE.cordRootShade, PALETTE.cordRootMix);

export const cordTipColorFor = (color: string): string =>
  mixHex(color, PALETTE.twigTip, PALETTE.cordTipMix);

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
