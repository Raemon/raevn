'use client';

import { useState } from 'react';
import type { GuestAdminRow } from './adminRowTypes';
import {
  adminMutedClassName,
  adminTableClassName,
  adminTdClassName,
  adminThClassName,
} from './adminTableStyles';
import EditableCell from './EditableCell';

const GUEST_COLUMNS = [
  'name',
  'rsvp',
  'diet',
  'child under 2',
  'high chair',
  'registered by',
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

const GuestsTable = ({ guests, adminKey }: { guests: GuestAdminRow[]; adminKey: string | null }) => {
  const [rows, setRows] = useState(guests);

  const patchGuestField = async (guestId: string, patch: Partial<GuestAdminRow>): Promise<boolean> => {
    const response = await fetch(`/api/admin/guests/${guestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, key: adminKey ?? '' }),
    }).catch(() => null);
    if (!response?.ok) return false;
    setRows((beforeRows) => beforeRows.map((row) => (row.id === guestId ? { ...row, ...patch } : row)));
    return true;
  };

  return (
    <div className="overflow-x-auto">
      <table className={adminTableClassName}>
        <thead>
          <tr>
            {GUEST_COLUMNS.map((column) => (
              <th key={column} className={adminThClassName}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={`${adminTdClassName} whitespace-nowrap`}>
                <EditableCell
                  value={row.name}
                  onCommit={(nextValue) =>
                    nextValue.trim() === ''
                      ? Promise.resolve(false)
                      : patchGuestField(row.id, { name: nextValue.trim() })
                  }
                />
              </td>
              <td className={`${adminTdClassName} ${row.rsvp === true ? 'text-[#a4c297]' : row.rsvp === false ? 'text-[#c98d8d]' : adminMutedClassName}`}>
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
              <td className={`${adminTdClassName} ${adminMutedClassName}`}>{row.registeredByName}</td>
              <td className={`${adminTdClassName} ${adminMutedClassName}`}>{row.inviteeName}</td>
              <td className={`${adminTdClassName} whitespace-nowrap text-xs ${adminMutedClassName}`}>
                {new Date(row.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className={`mt-2 text-sm italic ${adminMutedClassName}`}>No registrations yet.</p>}
    </div>
  );
};

export default GuestsTable;
