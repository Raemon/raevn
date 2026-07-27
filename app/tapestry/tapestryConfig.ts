import type { TapestryVariant } from './tapestryTypes';

// Which arrangement the live save-the-date page renders. Change this one line
// to switch (compare them all at /preview), or append
// ?tapestry=tree|tree2|tree3|knot|wreath to any page URL to preview an
// override without editing code.
export const LIVE_TAPESTRY_VARIANT: TapestryVariant = 'knot';

export const isTapestryVariant = (value: string | null | undefined): value is TapestryVariant =>
  value === 'tree' ||
  value === 'tree2' ||
  value === 'tree3' ||
  value === 'tree4' ||
  value === 'knot' ||
  value === 'wreath';
