import type { TapestryVariant } from './tapestryTypes';

// Which arrangement the live save-the-date page renders. Change this one line
// to switch (compare all three at /preview), or append ?tapestry=tree|knot|wreath
// to any page URL to preview an override without editing code.
export const LIVE_TAPESTRY_VARIANT: TapestryVariant = 'knot';

export const isTapestryVariant = (value: string | null | undefined): value is TapestryVariant =>
  value === 'tree' || value === 'knot' || value === 'wreath';
