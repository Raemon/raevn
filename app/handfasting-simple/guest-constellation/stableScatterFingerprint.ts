// Collapses negatives so placement math never feeds negative percentages.
const brightenScatterSeed = (rawSeed: number): number => Math.abs(rawSeed);

// Fuses the next letter into the scatter seed just like a tiny hash mixer.
const fuseNextLetterIntoScatterSeed = (seed: number, letterCode: number): number =>
  ((seed << 5) - seed + letterCode) | 0;

// Walks the label text so every character nudges the constellation differently.
export const fingerprintConstellationScatter = (guestKey: string): number => {
  let seedForGuestKey = 0;
  for (let letterIndexCursor = 0; letterIndexCursor < guestKey.length; letterIndexCursor += 1)
    seedForGuestKey = fuseNextLetterIntoScatterSeed(
      seedForGuestKey,
      guestKey.charCodeAt(letterIndexCursor),
    );
  return brightenScatterSeed(seedForGuestKey);
};
