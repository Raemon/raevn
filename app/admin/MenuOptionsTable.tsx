'use client';

import { useState } from 'react';
import type { MenuOptionAdminRow } from './adminRowTypes';
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

const MENU_COLUMNS = ['dish', 'description', 'diet'] as const;

const DIETS = ['vegan', 'vegetarian', 'omnivore'] as const;

const MenuOptionsTable = ({ adminKey }: { adminKey: string | null }) => {
  // Rows live in AdminRowsProvider, which re-reads the database every few
  // seconds; setRows still applies our own edits the instant they save.
  const { menuOptions: rows, updateMenuOptions: setRows } = useAdminRows();
  const [notice, setNotice] = useState<string | null>(null);

  const patchMenuOptionField = async (
    menuOptionId: string,
    patch: Partial<MenuOptionAdminRow>,
  ): Promise<boolean> => {
    const response = await fetch(`/api/admin/menu-options/${menuOptionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, key: adminKey ?? '' }),
    }).catch(() => null);
    if (!response?.ok) return false;
    setRows((beforeRows) =>
      beforeRows.map((row) => (row.id === menuOptionId ? { ...row, ...patch } : row)),
    );
    return true;
  };

  const addMenuOption = async () => {
    const response = await fetch('/api/admin/menu-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: adminKey ?? '' }),
    }).catch(() => null);
    if (!response?.ok) {
      setNotice('Could not add a dish.');
      return;
    }
    const { menuOption } = (await response.json()) as { menuOption: MenuOptionAdminRow };
    setRows((beforeRows) => [...beforeRows, menuOption]);
    setNotice(`Added “${menuOption.name}” — double-click its cells to fill it in`);
  };

  const deleteMenuOption = async (menuOptionId: string): Promise<boolean> => {
    const response = await fetch(`/api/admin/menu-options/${menuOptionId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: adminKey ?? '' }),
    }).catch(() => null);
    if (!response?.ok) return false;
    setRows((beforeRows) => beforeRows.filter((row) => row.id !== menuOptionId));
    return true;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button type="button" className={adminButtonClassName} onClick={() => void addMenuOption()}>
          Add dish
        </button>
        {notice && <span className={`text-base ${adminMutedClassName}`}>{notice}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className={adminTableClassName}>
          <thead>
            <tr>
              {MENU_COLUMNS.map((column) => (
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
                        : patchMenuOptionField(row.id, { name: nextValue.trim() })
                    }
                  />
                </td>
                <td className={adminTdClassName}>
                  <EditableCell
                    value={row.description}
                    placeholder="no description yet"
                    onCommit={(nextValue) =>
                      patchMenuOptionField(row.id, { description: nextValue.trim() })
                    }
                  />
                </td>
                <td className={`${adminTdClassName} whitespace-nowrap`}>
                  <EditableCell
                    value={row.diet}
                    onCommit={(nextValue) => {
                      const nextDiet = nextValue.trim().toLowerCase();
                      if (!DIETS.includes(nextDiet as (typeof DIETS)[number])) {
                        return Promise.resolve(false);
                      }
                      return patchMenuOptionField(row.id, {
                        diet: nextDiet as MenuOptionAdminRow['diet'],
                      });
                    }}
                  />
                </td>
                <td className={`${adminTdClassName} w-8 text-center`}>
                  <DeleteRowButton
                    label={row.name}
                    description="This deletes the menu option"
                    onDelete={() => deleteMenuOption(row.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className={`mt-2 text-base ${adminMutedClassName}`}>No dishes yet.</p>}
      </div>
    </div>
  );
};

export default MenuOptionsTable;
