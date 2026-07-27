import { promises as fs } from 'fs';
import path from 'path';
import { isInviteeColumnId } from '@/app/admin/inviteeColumns';

// The invitee table's column order lives in a checked-in JSON file rather than
// the database: it's a layout preference for the two of us, and committing it
// means the arrangement travels with the repo. Written from the admin page when
// a header is dragged, so this only works where the working tree is writable
// (local dev — which is the only place the admin table is used).
//
// It sits in config/ rather than app/ deliberately: a write inside app/ makes
// the dev server hot-reload the admin page mid-drag.
export const INVITEE_COLUMN_ORDER_FILE = path.join(
  process.cwd(),
  'config',
  'inviteeColumnOrder.json',
);

export const readInviteeColumnOrder = async (): Promise<string[] | null> => {
  const raw = await fs.readFile(INVITEE_COLUMN_ORDER_FILE, 'utf8').catch(() => null);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as { columns?: unknown };
    return Array.isArray(parsed.columns) ? parsed.columns.filter(isInviteeColumnId) : null;
  } catch {
    return null;
  }
};

export const writeInviteeColumnOrder = async (columns: string[]): Promise<boolean> => {
  const contents = `${JSON.stringify({ columns }, null, 2)}\n`;
  return fs
    .writeFile(INVITEE_COLUMN_ORDER_FILE, contents, 'utf8')
    .then(() => true)
    .catch(() => false);
};
