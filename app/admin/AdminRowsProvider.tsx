'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { GuestAdminRow, InviteeAdminRow, MenuOptionAdminRow } from './adminRowTypes';

// Every admin table reads its rows from here instead of from server props, so
// a single poll of /api/admin/rows keeps the whole page current while the two
// of us edit it at the same time.

const POLL_INTERVAL_MS = 5000;

type RowUpdater<Row> = (updateRows: (beforeRows: Row[]) => Row[]) => void;

type AdminRowsValue = {
  invitees: InviteeAdminRow[];
  guests: GuestAdminRow[];
  menuOptions: MenuOptionAdminRow[];
  updateInvitees: RowUpdater<InviteeAdminRow>;
  updateGuests: RowUpdater<GuestAdminRow>;
  updateMenuOptions: RowUpdater<MenuOptionAdminRow>;
};

const AdminRowsContext = createContext<AdminRowsValue | null>(null);

export const useAdminRows = (): AdminRowsValue => {
  const value = useContext(AdminRowsContext);
  if (!value) throw new Error('useAdminRows must be used inside <AdminRowsProvider>');
  return value;
};

// Rows arrive as fresh objects every poll; keeping the previous array when
// nothing actually changed spares every cell a re-render on a quiet ledger.
const sameRows = (beforeRows: unknown, nextRows: unknown): boolean =>
  JSON.stringify(beforeRows) === JSON.stringify(nextRows);

const AdminRowsProvider = ({
  initialInvitees,
  initialGuests,
  initialMenuOptions,
  children,
}: {
  initialInvitees: InviteeAdminRow[];
  initialGuests: GuestAdminRow[];
  initialMenuOptions: MenuOptionAdminRow[];
  children: ReactNode;
}) => {
  const [invitees, setInvitees] = useState(initialInvitees);
  const [guests, setGuests] = useState(initialGuests);
  const [menuOptions, setMenuOptions] = useState(initialMenuOptions);

  // A poll that left before our own edit landed can only be carrying staler
  // data, so its answer gets dropped rather than flickering the edit away.
  const lastLocalEditAtRef = useRef(0);

  const updateInvitees = useCallback<RowUpdater<InviteeAdminRow>>((updateRows) => {
    lastLocalEditAtRef.current = Date.now();
    setInvitees(updateRows);
  }, []);
  const updateGuests = useCallback<RowUpdater<GuestAdminRow>>((updateRows) => {
    lastLocalEditAtRef.current = Date.now();
    setGuests(updateRows);
  }, []);
  const updateMenuOptions = useCallback<RowUpdater<MenuOptionAdminRow>>((updateRows) => {
    lastLocalEditAtRef.current = Date.now();
    setMenuOptions(updateRows);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const pollOnce = async () => {
      if (document.hidden) return;
      const startedAt = Date.now();
      const response = await fetch('/api/admin/rows', {
        cache: 'no-store',
      }).catch(() => null);
      if (!response?.ok || isCancelled) return;
      const rows = (await response.json().catch(() => null)) as {
        invitees: InviteeAdminRow[];
        guests: GuestAdminRow[];
        menuOptions: MenuOptionAdminRow[];
      } | null;
      if (!rows || isCancelled || lastLocalEditAtRef.current > startedAt) return;
      setInvitees((beforeRows) => (sameRows(beforeRows, rows.invitees) ? beforeRows : rows.invitees));
      setGuests((beforeRows) => (sameRows(beforeRows, rows.guests) ? beforeRows : rows.guests));
      setMenuOptions((beforeRows) =>
        sameRows(beforeRows, rows.menuOptions) ? beforeRows : rows.menuOptions,
      );
    };

    // Coming back to a tab that sat idle should show the current ledger at
    // once, not up to five seconds of stale rows.
    const pollOnReturn = () => {
      if (!document.hidden) void pollOnce();
    };
    document.addEventListener('visibilitychange', pollOnReturn);
    const timer = setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
    return () => {
      isCancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', pollOnReturn);
    };
  }, []);

  return (
    <AdminRowsContext.Provider
      value={{ invitees, guests, menuOptions, updateInvitees, updateGuests, updateMenuOptions }}
    >
      {children}
    </AdminRowsContext.Provider>
  );
};

// The counts beside the section headings, live alongside the tables they count.
export const AdminRowCount = ({ of }: { of: 'invitees' | 'guests' | 'menuOptions' }) => {
  const rows = useAdminRows();
  return <>{rows[of].length}</>;
};

export default AdminRowsProvider;
