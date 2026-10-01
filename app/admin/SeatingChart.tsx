'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useAdminRows } from './AdminRowsProvider';
import { adminButtonClassName, adminMutedClassName } from './adminTableStyles';
import SeatingGuestChip from './SeatingGuestChip';
import SeatingTable from './SeatingTable';
import {
  moveGuestToSeat,
  reconcileSeatingTables,
  seatedGuestIds,
  selectSeatableGuests,
  unseatGuest,
  type SeatingTable as SeatingTableState,
} from '@/lib/seatingChart';
import { partyColorForKey, partyIdByGuestId, suggestSeating } from '@/lib/suggestSeating';

type DragState = {
  guestId: string;
  x: number;
  y: number;
};

type DropSeat = {
  tableIndex: number;
  seatIndex: number;
};

const readDropFromPoint = (x: number, y: number): DropSeat | 'unseated' | null => {
  const elementsAtPoint = document.elementsFromPoint(x, y);
  for (const element of elementsAtPoint) {
    if (!(element instanceof HTMLElement)) continue;
    if (element.closest('[data-unseated-tray]')) return 'unseated';
    const seatNode = element.closest('[data-seat]');
    const seatValue = seatNode instanceof HTMLElement ? seatNode.dataset.seat : undefined;
    if (!seatValue) continue;
    const [tableText, seatText] = seatValue.split(':');
    const tableIndex = Number(tableText);
    const seatIndex = Number(seatText);
    if (Number.isInteger(tableIndex) && Number.isInteger(seatIndex)) return { tableIndex, seatIndex };
  }
  return null;
};

const saveSeating = async (tables: SeatingTableState[]): Promise<boolean> => {
  const response = await fetch('/api/admin/seating', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tables }),
  }).catch(() => null);
  return !!response?.ok;
};

const SeatingChart = () => {
  const { guests } = useAdminRows();
  const seatableGuests = useMemo(() => selectSeatableGuests(guests), [guests]);
  const seatableGuestIds = useMemo(
    () => new Set(seatableGuests.map((guest) => guest.id)),
    [seatableGuests],
  );
  const guestById = useMemo(
    () => new Map(seatableGuests.map((guest) => [guest.id, guest])),
    [seatableGuests],
  );
  const partyIds = useMemo(() => partyIdByGuestId(seatableGuests), [seatableGuests]);
  const partyColors = useMemo(() => {
    const colors = new Map<string, string>();
    for (const guest of seatableGuests) {
      colors.set(guest.id, partyColorForKey(partyIds.get(guest.id) ?? guest.id));
    }
    return colors;
  }, [partyIds, seatableGuests]);

  const [tables, setTables] = useState<SeatingTableState[] | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropSeat, setDropSeat] = useState<DropSeat | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tablesRef = useRef<SeatingTableState[] | null>(null);
  const guestsRef = useRef(guests);
  tablesRef.current = tables;
  guestsRef.current = guests;

  const applyTables = (nextTables: SeatingTableState[]) => {
    setTables(nextTables);
    void saveSeating(nextTables).then((ok) => {
      if (!ok) setNotice('Could not save the seating chart.');
    });
  };

  useEffect(() => {
    let isCancelled = false;
    const loadSeating = async () => {
      const response = await fetch('/api/admin/seating', { cache: 'no-store' }).catch(() => null);
      if (!response?.ok || isCancelled) return;
      const payload = (await response.json().catch(() => null)) as { tables: SeatingTableState[] | null } | null;
      if (isCancelled) return;
      const currentGuests = guestsRef.current;
      const currentSeatableIds = new Set(selectSeatableGuests(currentGuests).map((guest) => guest.id));
      const savedTables = payload?.tables;
      const nextTables = savedTables
        ? reconcileSeatingTables(savedTables, currentSeatableIds)
        : suggestSeating(currentGuests);
      setTables(nextTables);
      if (!savedTables) void saveSeating(nextTables);
    };
    void loadSeating();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const currentTables = tablesRef.current;
    if (!currentTables) return;
    const nextTables = reconcileSeatingTables(currentTables, seatableGuestIds);
    if (JSON.stringify(nextTables) !== JSON.stringify(currentTables)) applyTables(nextTables);
  }, [seatableGuestIds]);

  const unseatedGuests = useMemo(() => {
    if (!tables) return seatableGuests;
    const seatedIds = seatedGuestIds(tables);
    return seatableGuests.filter((guest) => !seatedIds.has(guest.id));
  }, [seatableGuests, tables]);

  const startDrag = (guestId: string, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDrag({ guestId, x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    if (!drag) return;
    const onPointerMove = (event: globalThis.PointerEvent) => {
      setDrag({ guestId: drag.guestId, x: event.clientX, y: event.clientY });
      const drop = readDropFromPoint(event.clientX, event.clientY);
      setDropSeat(drop && drop !== 'unseated' ? drop : null);
    };
    const onPointerUp = (event: globalThis.PointerEvent) => {
      const currentTables = tablesRef.current;
      const drop = readDropFromPoint(event.clientX, event.clientY);
      if (currentTables && drop === 'unseated') applyTables(unseatGuest(currentTables, drag.guestId));
      else if (currentTables && drop && drop !== 'unseated') {
        applyTables(moveGuestToSeat(currentTables, drag.guestId, drop.tableIndex, drop.seatIndex));
      }
      setDrag(null);
      setDropSeat(null);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [drag]);

  const resetToSuggested = () => {
    const nextTables = suggestSeating(guests);
    applyTables(nextTables);
    setNotice('Restored the suggested seating.');
  };

  const draggingGuest = drag ? guestById.get(drag.guestId) ?? null : null;

  if (!tables) {
    return <p className={`text-base ${adminMutedClassName}`}>Seating the hall…</p>;
  }

  return (
    <div className="relative select-none">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button type="button" className={adminButtonClassName} onClick={resetToSuggested}>
          Restore suggested seating
        </button>
        <span className={`text-sm ${adminMutedClassName}`}>
          Drag a name onto a seat to move · drop onto a name to swap · partners sit across the linen
        </span>
        {notice && <span className={`text-sm ${adminMutedClassName}`}>{notice}</span>}
      </div>

      {unseatedGuests.length > 0 && (
        <div data-unseated-tray className="mb-6">
          <div className="mb-1 text-sm font-medium text-[#7a5a1c]">Not yet seated</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {unseatedGuests.map((guest) => (
              <div key={guest.id} className="w-52">
                <SeatingGuestChip
                  guest={guest}
                  partyColor={partyColors.get(guest.id) ?? '#7a5a1c'}
                  isDragging={drag?.guestId === guest.id}
                  onPointerDown={(event) => startDrag(guest.id, event)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
        {tables.map((table, tableIndex) => (
          <SeatingTable
            key={table.id}
            tableIndex={tableIndex}
            seats={table.seats}
            guestById={guestById}
            partyColorByGuestId={partyColors}
            partyIdByGuestId={partyIds}
            draggingGuestId={drag?.guestId ?? null}
            dropSeat={dropSeat}
            onPointerDownGuest={startDrag}
          />
        ))}
      </div>

      {draggingGuest && drag && (
        <div
          className="pointer-events-none fixed z-20 w-52 bg-[#faf8f4] px-1 py-0.5 opacity-90"
          style={{ left: drag.x + 12, top: drag.y - 10 }}
        >
          <SeatingGuestChip
            guest={draggingGuest}
            partyColor={partyColors.get(draggingGuest.id) ?? '#7a5a1c'}
            onPointerDown={() => undefined}
          />
        </div>
      )}
    </div>
  );
};

export const SeatingCount = () => {
  const { guests } = useAdminRows();
  return <>{selectSeatableGuests(guests).length}</>;
};

export default SeatingChart;
