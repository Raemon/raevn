'use client';

import type { PointerEvent } from 'react';
import type { GuestAdminRow } from './adminRowTypes';
import SeatingGuestChip from './SeatingGuestChip';
import { SEATS_PER_TABLE } from '@/lib/seatingChart';

const LEFT_SEATS = [0, 1, 2, 3] as const;
const RIGHT_SEATS = [4, 5, 6, 7] as const;

const SeatingSeat = ({
  tableIndex,
  seatIndex,
  guest,
  partyColor,
  isDropTarget,
  isPartyMate,
  isDragging,
  onPointerDownGuest,
}: {
  tableIndex: number;
  seatIndex: number;
  guest: GuestAdminRow | null;
  partyColor: string;
  isDropTarget: boolean;
  isPartyMate: boolean;
  isDragging: boolean;
  onPointerDownGuest: (guestId: string, event: PointerEvent<HTMLButtonElement>) => void;
}) => (
  <div
    data-seat={`${tableIndex}:${seatIndex}`}
    className={`min-h-7 min-w-0 flex-1 ${isDropTarget ? 'bg-[#e8d7b0]' : ''}`}
  >
    {guest ? (
      <SeatingGuestChip
        guest={guest}
        partyColor={partyColor}
        isPartyMate={isPartyMate}
        isDragging={isDragging}
        onPointerDown={(event) => onPointerDownGuest(guest.id, event)}
      />
    ) : (
      <div className="px-1 py-1 text-sm text-[#cfc7b6]">·</div>
    )}
  </div>
);

const SeatingTable = ({
  tableIndex,
  seats,
  guestById,
  partyColorByGuestId,
  partyIdByGuestId,
  draggingGuestId,
  dropSeat,
  onPointerDownGuest,
}: {
  tableIndex: number;
  seats: Array<string | null>;
  guestById: Map<string, GuestAdminRow>;
  partyColorByGuestId: Map<string, string>;
  partyIdByGuestId: Map<string, string>;
  draggingGuestId: string | null;
  dropSeat: { tableIndex: number; seatIndex: number } | null;
  onPointerDownGuest: (guestId: string, event: PointerEvent<HTMLButtonElement>) => void;
}) => {
  const seatedCount = seats.filter(Boolean).length;
  const draggingPartyId = draggingGuestId ? partyIdByGuestId.get(draggingGuestId) : null;
  const renderSeat = (seatIndex: number) => {
    const guestId = seats[seatIndex] ?? null;
    const guest = guestId ? guestById.get(guestId) ?? null : null;
    return (
      <SeatingSeat
        key={seatIndex}
        tableIndex={tableIndex}
        seatIndex={seatIndex}
        guest={guest}
        partyColor={guestId ? partyColorByGuestId.get(guestId) ?? '#7a5a1c' : '#7a5a1c'}
        isDropTarget={dropSeat?.tableIndex === tableIndex && dropSeat.seatIndex === seatIndex}
        isPartyMate={!!guest && !!draggingPartyId && partyIdByGuestId.get(guest.id) === draggingPartyId && guest.id !== draggingGuestId}
        isDragging={guestId === draggingGuestId}
        onPointerDownGuest={onPointerDownGuest}
      />
    );
  };

  return (
    <div data-table={tableIndex} className="min-w-0">
      <div className="mb-1 flex items-baseline justify-between text-sm text-[#7a5a1c]">
        <span className="font-medium">Table {tableIndex + 1}</span>
        <span className="text-[#6f6a61]">
          {seatedCount}/{SEATS_PER_TABLE}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_2.5rem_1fr] bg-[#efe6d4]">
        <div className="flex flex-col bg-[#faf8f4]">
          {LEFT_SEATS.map((seatIndex) => renderSeat(seatIndex))}
        </div>
        <div className="bg-[#e4d3b0]" />
        <div className="flex flex-col bg-[#faf8f4]">
          {RIGHT_SEATS.map((seatIndex) => renderSeat(seatIndex))}
        </div>
      </div>
    </div>
  );
};

export default SeatingTable;
