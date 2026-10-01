'use client';

import type { PointerEvent } from 'react';
import type { GuestAdminRow } from './adminRowTypes';

const SeatingGuestChip = ({
  guest,
  partyColor,
  isPartyMate = false,
  isDragging = false,
  onPointerDown,
}: {
  guest: GuestAdminRow;
  partyColor: string;
  isPartyMate?: boolean;
  isDragging?: boolean;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}) => {
  const note = guest.note?.trim() ?? '';
  return (
    <button
      type="button"
      data-guest-chip={guest.id}
      title={note === '' ? guest.name : `${guest.name} — ${note}`}
      onPointerDown={onPointerDown}
      className={`flex w-full cursor-grab touch-none items-center gap-1.5 px-1 py-0.5 text-left text-sm leading-tight text-[#1f1c18] active:cursor-grabbing ${
        isDragging ? 'opacity-30' : isPartyMate ? 'bg-[#f3e9d5]' : ''
      }`}
    >
      <span className="h-2 w-2 shrink-0" style={{ background: partyColor }} />
      <span className="min-w-0 truncate">
        {guest.name}
        {guest.isChildUnder2 && <span className="ml-1 text-[#6f6a61]">baby</span>}
      </span>
    </button>
  );
};

export default SeatingGuestChip;
