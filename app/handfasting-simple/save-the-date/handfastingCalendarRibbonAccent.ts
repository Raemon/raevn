import { HANDFASTING_RSVP_SUNSET_SURFACE_PALETTE } from './handfastingRsvpSurfacePalette';

// Keys hover halos toward the RSVP palette cue per vendor row.

export const glowAccentPaletteTokenForRibbonSlot = (ribbonSlotIndex: number): string => {
  if (ribbonSlotIndex === 0) return HANDFASTING_RSVP_SUNSET_SURFACE_PALETTE.burgundy;
  if (ribbonSlotIndex === 1) return HANDFASTING_RSVP_SUNSET_SURFACE_PALETTE.inkSoft;
  return HANDFASTING_RSVP_SUNSET_SURFACE_PALETTE.navy;
};
