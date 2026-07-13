'use client';

import ConstellationNameLabel from './ConstellationNameLabel';
import type { GuestWithOptimistic } from './guestTypes';

const GuestDisplay = ({
  guests,
  nameClassName,
}: {
  guests: GuestWithOptimistic[];
  nameClassName: string;
}) => {
  if (guests.length === 0) {
    return null;
  }
  return (
    <div
      className="relative mx-auto mt-6 mb-[500px] w-full max-w-[min(100%,28rem)] select-none"
      aria-label="Guest names"
    >
      <div className="relative aspect-[5/4] w-full">
        {guests.map((guestSkyRow, slotIndex) => (
          <ConstellationNameLabel
            key={guestSkyRow.id}
            guestSkyRow={guestSkyRow}
            slotIndex={slotIndex}
            slotCount={guests.length}
            nameFontClassName={nameClassName}
          />
        ))}
      </div>
    </div>
  );
};

export default GuestDisplay;
