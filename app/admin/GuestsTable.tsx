'use client';

import { useState } from 'react';
import type { GuestAdminRow } from './adminRowTypes';
import { useAdminRows } from './AdminRowsProvider';
import {
  adminButtonClassName,
  adminMutedClassName,
  adminNameCellClassName,
  adminTableClassName,
  adminTdClassName,
  adminThClassName,
} from './adminTableStyles';
import DeleteRowButton from './DeleteRowButton';
import EditableCell from './EditableCell';
import GuestPartyLinkSelect from './GuestPartyLinkSelect';

const GUEST_COLUMNS = [
  'name',
  'rsvp',
  'diet',
  'child under 2',
  'high chair',
  'party link',
  'invitee link',
  'created',
] as const;

const describeRsvp = (rsvp: boolean | null): string =>
  rsvp === true ? 'yes' : rsvp === false ? 'no' : 'undecided';

// Text typed into a cell → typed value; null means "reject the edit".

const parseRsvpText = (text: string): boolean | null | undefined => {
  const normalized = text.trim().toLowerCase();
  if (normalized === 'yes') return true;
  if (normalized === 'no') return false;
  if (normalized === 'undecided' || normalized === '') return null;
  return undefined;
};

const parseBooleanText = (text: string): boolean | undefined => {
  const normalized = text.trim().toLowerCase();
  if (['yes', 'y', 'true'].includes(normalized)) return true;
  if (['no', 'n', 'false', ''].includes(normalized)) return false;
  return undefined;
};

const GuestsTable = () => {
  // Rows live in AdminRowsProvider, which re-reads the database every few
  // seconds; setRows still applies our own edits the instant they save.
  const { guests: rows, updateGuests: setRows } = useAdminRows();
  const [notice, setNotice] = useState<string | null>(null);

  const patchGuestField = async (guestId: string, patch: Partial<GuestAdminRow>): Promise<boolean> => {
    const response = await fetch(`/api/admin/guests/${guestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => null);
    if (!response?.ok) return false;
    const payload = (await response.json().catch(() => null)) as {
      guest?: Partial<GuestAdminRow>;
    } | null;
    const savedFields = payload?.guest ?? patch;
    setRows((beforeRows) =>
      beforeRows.map((row) => (row.id === guestId ? { ...row, ...savedFields } : row)),
    );
    return true;
  };

  const partyLinkOptionsForGuest = (guestId: string) =>
    rows
      .filter((candidate) => candidate.registeredById === null && candidate.id !== guestId)
      .map((candidate) => ({
        id: candidate.id,
        label: candidate.inviteeName ? `${candidate.name} (${candidate.inviteeName})` : candidate.name,
      }));

  // A blank registration for the people who RSVP by text instead of the site;
  // the row lands at the bottom for double-click editing.
  const addGuest = async () => {
    const response = await fetch('/api/admin/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => null);
    if (!response?.ok) {
      setNotice('Could not add a registration.');
      return;
    }
    const { guest } = (await response.json()) as { guest: GuestAdminRow };
    setRows((beforeRows) => [...beforeRows, guest]);
    setNotice(`Added “${guest.name}” — double-click its cells to fill it in`);
  };

  const deleteGuest = async (guestId: string): Promise<boolean> => {
    const response = await fetch(`/api/admin/guests/${guestId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => null);
    if (!response?.ok) return false;
    setRows((beforeRows) => beforeRows.filter((row) => row.id !== guestId));
    return true;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button type="button" className={adminButtonClassName} onClick={() => void addGuest()}>
          Add registration
        </button>
        {notice && <span className={`text-base ${adminMutedClassName}`}>{notice}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className={adminTableClassName}>
          <thead>
            <tr>
              {GUEST_COLUMNS.map((column) => (
                <th key={column} className={adminThClassName}>
                  {column}
                </th>
              ))}
              <th className={`${adminThClassName} w-8`} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={adminTdClassName}>
                  <EditableCell
                    className={adminNameCellClassName}
                    value={row.name}
                    onCommit={(nextValue) =>
                      nextValue.trim() === ''
                        ? Promise.resolve(false)
                        : patchGuestField(row.id, { name: nextValue.trim() })
                    }
                  />
                </td>
                <td className={`${adminTdClassName} ${row.rsvp === true ? 'font-medium text-[#2f6b33]' : row.rsvp === false ? 'font-medium text-[#a33a3a]' : adminMutedClassName}`}>
                  <EditableCell
                    value={describeRsvp(row.rsvp)}
                    onCommit={(nextValue) => {
                      const nextRsvp = parseRsvpText(nextValue);
                      if (nextRsvp === undefined) return Promise.resolve(false);
                      return patchGuestField(row.id, { rsvp: nextRsvp });
                    }}
                  />
                </td>
                <td className={adminTdClassName}>
                  <EditableCell
                    value={row.diet}
                    onCommit={(nextValue) => {
                      const nextDiet = nextValue.trim().toLowerCase();
                      if (!['omnivore', 'vegetarian', 'vegan'].includes(nextDiet)) return Promise.resolve(false);
                      return patchGuestField(row.id, { diet: nextDiet as GuestAdminRow['diet'] });
                    }}
                  />
                </td>
                <td className={adminTdClassName}>
                  <EditableCell
                    value={row.isChildUnder2 ? 'yes' : ''}
                    placeholder=""
                    onCommit={(nextValue) => {
                      const nextFlag = parseBooleanText(nextValue);
                      if (nextFlag === undefined) return Promise.resolve(false);
                      return patchGuestField(row.id, { isChildUnder2: nextFlag });
                    }}
                  />
                </td>
                <td className={adminTdClassName}>
                  <EditableCell
                    value={row.needsHighChair ? 'yes' : ''}
                    placeholder=""
                    onCommit={(nextValue) => {
                      const nextFlag = parseBooleanText(nextValue);
                      if (nextFlag === undefined) return Promise.resolve(false);
                      return patchGuestField(row.id, { needsHighChair: nextFlag });
                    }}
                  />
                </td>
                <td className={adminTdClassName}>
                  <GuestPartyLinkSelect
                    registeredById={row.registeredById}
                    primaryOptions={partyLinkOptionsForGuest(row.id)}
                    familyCount={rows.filter((candidate) => candidate.registeredById === row.id).length}
                    disabled={rows.some((candidate) => candidate.registeredById === row.id)}
                    onCommit={async (registeredById) => {
                      const saved = await patchGuestField(row.id, { registeredById });
                      if (!saved) setNotice('Could not update party link.');
                      return saved;
                    }}
                  />
                </td>
                <td className={adminTdClassName}>
                  <span className={`block ${adminNameCellClassName} ${adminMutedClassName}`}>{row.inviteeName}</span>
                </td>
                <td className={`${adminTdClassName} whitespace-nowrap text-sm ${adminMutedClassName}`}>
                  {new Date(row.createdAt).toLocaleString()}
                </td>
                <td className={`${adminTdClassName} w-8 text-center`}>
                  <DeleteRowButton
                    label={row.name}
                    description="This deletes the registration for"
                    onDelete={() => deleteGuest(row.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className={`mt-2 text-base ${adminMutedClassName}`}>No registrations yet.</p>}
      </div>
    </div>
  );
};

export default GuestsTable;
