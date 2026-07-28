// 0 = Ray (maroon), 1 = Elizabeth (blue). Used to place a person on the
// couple's spectrum in the tapestry crown and roots.
export const sideBlendFromSide = (side: string): number => {
  if (side === 'elizabeth') return 1;
  if (side === 'ray') return 0;
  return 0.5;
};

export const resolveSideBlend = (sideBlend: number | null | undefined, side: string): number =>
  typeof sideBlend === 'number' && Number.isFinite(sideBlend)
    ? Math.min(1, Math.max(0, sideBlend))
    : sideBlendFromSide(side);
