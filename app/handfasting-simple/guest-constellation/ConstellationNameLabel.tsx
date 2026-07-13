'use client';

import { readConstellationPlacement } from './constellationPlacement';
import type { GuestWithOptimistic } from './guestTypes';

const ConstellationNameLabel = ({
  guestSkyRow,
  slotIndex,
  slotCount,
  nameFontClassName,
}: {
  guestSkyRow: GuestWithOptimistic;
  slotIndex: number;
  slotCount: number;
  nameFontClassName: string;
}) => {
  const placement = readConstellationPlacement(guestSkyRow, slotIndex, slotCount);
  const transformSentence = `translate(-50%, -50%) scale(${placement.scale})`;
  return (
    <span
      className={`${nameFontClassName} pointer-events-none absolute max-w-[12rem] truncate text-[clamp(0.78rem,2.8vw,0.98rem)] font-normal leading-tight tracking-[0.02em] transition-[opacity,transform] duration-500`}
      style={{
        left: `${placement.leftPercent}%`,
        top: `${placement.topPercent}%`,
        transform: transformSentence,
        opacity: placement.opacity,
      }}
      title={guestSkyRow.name}
    >
      {guestSkyRow.name}
    </span>
  );
};

export default ConstellationNameLabel;
