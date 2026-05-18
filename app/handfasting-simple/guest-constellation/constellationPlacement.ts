import { fingerprintConstellationScatter } from './stableScatterFingerprint';
import type { GuestWithOptimistic } from './guestTypes';

export type ConstellationPolarPlacement = {
  leftPercent: number;
  topPercent: number;
  rotationDeg: number;
  scale: number;
  opacity: number;
};

// Fans orbit slots around the celestial clock so crowds feel balanced.
export const sweepConstellationSlotRadians = (slotIndex: number, slotCount: number): number =>
  slotCount <= 1 ? -Math.PI / 2 : (slotIndex / slotCount) * 2 * Math.PI;

// Injects humane irregularity reminiscent of handwritten seating cards.
export const wobbleConstellationAngle = (scatterFingerprint: number): number =>
  ((scatterFingerprint % 1000) / 1000 - 0.5) * 0.55;

// Pushes midsize gatherings outward while honoring solo arrivals at center zenith.
export const stretchConstellationRadiusPercent = (
  scatterFingerprint: number,
  slotCount: number,
): number => (slotCount <= 1 ? 0 : 26 + (scatterFingerprint % 38));

// Tilts each label slightly so serif strokes catch moonlight asymmetrically.

export const spinConstellationLabelDegrees = (scatterFingerprint: number): number =>
  ((scatterFingerprint % 17) - 8) * 0.85;

// Gives weight variation so handwriting hierarchy feels orchestral.

export const scaleConstellationLabel = (scatterFingerprint: number): number =>
  0.94 + ((scatterFingerprint >> 5) % 12) / 100;

// Lets optimistic entries glow softer until Postgres blesses them.

export const breatheConstellationLabelOpacity = (
  guestSkyRow: GuestWithOptimistic,
  scatterFingerprint: number,
): number =>
  guestSkyRow.optimistic ? 0.5 : 0.88 + ((scatterFingerprint >> 9) % 12) / 100;

// Converts polar intuition into CSS percentages Tailwind understands.

export const driftConstellationWestEast = (
  orbitRadiusPercent: number,
  blendRadians: number,
): number => 50 + orbitRadiusPercent * Math.cos(blendRadians);

// Bridges radial math toward vertical drift for gentle sky arcs.

export const driftConstellationNorthSouth = (
  orbitRadiusPercent: number,
  blendRadians: number,
): number => 50 + orbitRadiusPercent * Math.sin(blendRadians);

// Bundles trig bias so label presentation stays declarative.

export const bundleConstellationPlacementBox = (
  guestSkyRow: GuestWithOptimistic,
  scatterFingerprint: number,
  blendRadians: number,
  orbitRadiusPercent: number,
): ConstellationPolarPlacement => ({
  leftPercent: driftConstellationWestEast(orbitRadiusPercent, blendRadians),
  topPercent: driftConstellationNorthSouth(orbitRadiusPercent, blendRadians),
  rotationDeg: spinConstellationLabelDegrees(scatterFingerprint),
  scale: scaleConstellationLabel(scatterFingerprint),
  opacity: breatheConstellationLabelOpacity(guestSkyRow, scatterFingerprint),
});

// Collapses trig inputs so JSX only reads ergonomic CSS knobs.

const blendConstellationSweepAndWobble = (
  slotIndex: number,
  slotCount: number,
  scatterFingerprint: number,
): number =>
  sweepConstellationSlotRadians(slotIndex, slotCount) + wobbleConstellationAngle(scatterFingerprint);

// Collapses trig inputs so JSX only reads ergonomic CSS knobs.

const finalizeConstellationPlacementLayer = (
  guestSkyRow: GuestWithOptimistic,
  scatterFingerprint: number,
  blendRadians: number,
  slotCount: number,
): ConstellationPolarPlacement => {
  const orbitRadiusPercent = stretchConstellationRadiusPercent(scatterFingerprint, slotCount);
  return bundleConstellationPlacementBox(guestSkyRow, scatterFingerprint, blendRadians, orbitRadiusPercent);
};

const materializeConstellationPolarBox = (
  guestSkyRow: GuestWithOptimistic,
  slotIndex: number,
  slotCount: number,
): ConstellationPolarPlacement => {
  const scatterFingerprint = fingerprintConstellationScatter(guestSkyRow.id);
  const blendRadians = blendConstellationSweepAndWobble(slotIndex, slotCount, scatterFingerprint);
  return finalizeConstellationPlacementLayer(guestSkyRow, scatterFingerprint, blendRadians, slotCount);
};

export const readConstellationPlacement = (
  guestSkyRow: GuestWithOptimistic,
  slotIndex: number,
  slotCount: number,
): ConstellationPolarPlacement =>
  materializeConstellationPolarBox(guestSkyRow, slotIndex, slotCount);
