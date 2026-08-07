'use client';

import { Fragment, useMemo, useState, type ReactNode } from 'react';
import type { InviteeAdminRow } from './adminRowTypes';
import type { InvitationSendResult } from '../api/admin/send-invitations/route';
import { useAdminRows } from './AdminRowsProvider';
import {
  adminButtonClassName,
  adminEmailCellClassName,
  adminMutedClassName,
  adminNameCellClassName,
  adminTableClassName,
  adminTdClassName,
  adminThClassName,
} from './adminTableStyles';
import DeleteRowButton from './DeleteRowButton';
import DryRunPanel from './DryRunPanel';
import EditableCell from './EditableCell';
import GuestPartyLinkSelect from './GuestPartyLinkSelect';
import { hovertextIssues, sharedSignoffWarnings } from './hovertextIssues';
import InvitationEditor from './InvitationEditor';
import SendInvitationButton from './SendInvitationButton';
import { formatSideBlend } from '@/lib/sideBlend';
import {
  INVITEE_COLUMN_LABELS,
  orderInviteeColumns,
  type InviteeColumnId,
} from './inviteeColumns';

// A chain-link glyph, sized to sit quietly at the right edge of its column —
// the whole invite-link cell is one small target that opens in a new tab.
const LinkIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width={16}
    height={16}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    aria-hidden
  >
    <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.4" />
    <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.32-1.32" />
  </svg>
);

// Sorting is a view over the ledger only — nothing here writes sortOrder, so
// switching back to "order" always restores the hand-arranged sequence.
const SORT_OPTIONS = [
  { id: 'needsAttention', label: 'needs attention' },
  { id: 'order', label: 'order (#)' },
  { id: 'name', label: 'name' },
  { id: 'shortestHovertext', label: 'shortest diagram hovertext' },
  { id: 'notEmailed', label: 'not emailed first' },
] as const;

type InviteeSortId = (typeof SORT_OPTIONS)[number]['id'];

const compareBySortOrder = (a: InviteeAdminRow, b: InviteeAdminRow): number =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

// Deliberately loose: this asks "is there an address here at all", so it
// catches a blank, a bare name, and "ask Ray" rather than RFC edge cases.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// The default view is a to-do list — whatever still needs a pass comes first,
// in the order we'd do the work: chase down an address, write the missing
// hovertexts, then fix the ones hovertextIssues flags as wrong, then collect the
// second signature on the middle-blend ones. Everything finished sits below,
// still in hand-arranged order.
const attentionRank = (row: InviteeAdminRow, duplicateEmails: Set<string>): number => {
  if (!LOOKS_LIKE_EMAIL.test(row.email?.trim() ?? '')) return 0;
  if (duplicateEmails.has(normalizedEmail(row))) return 1;
  if ((row.diagramHovertext?.trim() ?? '') === '') return 2;
  if (hovertextIssues(row).length > 0) return 3;
  if (sharedSignoffWarnings(row).length > 0) return 4;
  return 5;
};

// Every comparator falls back to the hand-arranged order, so rows that tie on
// the chosen key (all the empty hovertexts, all the unsent invitees) stay in the
// sequence you already know rather than shuffling on each poll.
const inviteeComparators = (
  duplicateEmails: Set<string>,
): Record<InviteeSortId, (a: InviteeAdminRow, b: InviteeAdminRow) => number> => ({
  needsAttention: (a, b) =>
    attentionRank(a, duplicateEmails) - attentionRank(b, duplicateEmails) ||
    compareBySortOrder(a, b),
  order: compareBySortOrder,
  name: (a, b) => a.name.localeCompare(b.name) || compareBySortOrder(a, b),
  shortestHovertext: (a, b) =>
    (a.diagramHovertext?.trim().length ?? 0) - (b.diagramHovertext?.trim().length ?? 0) ||
    compareBySortOrder(a, b),
  notEmailed: (a, b) =>
    Number(!!a.invitationSentAt) - Number(!!b.invitationSentAt) || compareBySortOrder(a, b),
});

const normalizedEmail = (row: InviteeAdminRow): string => row.email?.trim().toLowerCase() ?? '';

// One send request per handful rather than one for the whole list: each email
// is a second or two of SMTP, and a request that outlives the serverless
// function reports a failure for mail that already went out.
const SEND_BATCH_SIZE = 8;

const InviteesTable = ({
  baseUrl,
  hasDefaultInvitation,
  hasInvitationEmail,
  columnOrder,
}: {
  baseUrl: string;
  hasDefaultInvitation: boolean;
  hasInvitationEmail: boolean;
  columnOrder: string[] | null;
}) => {
  // Sending needs the invitation email written; the letter above only decides
  // what /invite/[token] renders once they follow the link.
  const readyToSend = (row: InviteeAdminRow): boolean =>
    !!row.email && !!row.inviteToken && hasInvitationEmail;
  // Rows live in AdminRowsProvider, which re-reads the database every few
  // seconds; setRows still applies our own edits the instant they save.
  const { invitees: rows, updateInvitees: setRows } = useAdminRows();
  const [sortBy, setSortBy] = useState<InviteeSortId>('needsAttention');
  const [editingInviteeId, setEditingInviteeId] = useState<string | null>(null);
  const [sendReport, setSendReport] = useState<string | null>(null);
  const [columns, setColumns] = useState(() => orderInviteeColumns(columnOrder));
  const [draggingColumn, setDraggingColumn] = useState<InviteeColumnId | null>(null);
  const [dropTargetColumn, setDropTargetColumn] = useState<InviteeColumnId | null>(null);

  // Addresses that more than one invitee is sitting on — worked out once per
  // poll rather than per cell.
  const duplicateEmails = useMemo(() => {
    const countByEmail = new Map<string, number>();
    for (const row of rows) {
      const email = normalizedEmail(row);
      if (email !== '') countByEmail.set(email, (countByEmail.get(email) ?? 0) + 1);
    }
    return new Set(
      [...countByEmail].filter(([, count]) => count > 1).map(([email]) => email),
    );
  }, [rows]);

  // Persists one field, then mirrors it locally; a false return reverts the cell.
  const patchInviteeField = async (
    inviteeId: string,
    patch: Partial<InviteeAdminRow>,
  ): Promise<boolean> => {
    const response = await fetch(`/api/admin/invitees/${inviteeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => null);
    if (!response?.ok) return false;
    const payload = (await response.json().catch(() => null)) as {
      invitee?: Partial<InviteeAdminRow>;
    } | null;
    const savedFields = payload?.invitee ?? patch;
    setRows((beforeRows) =>
      beforeRows.map((row) => (row.id === inviteeId ? { ...row, ...savedFields } : row)),
    );
    return true;
  };

  const partyLinkOptionsForInvitee = (inviteeId: string) =>
    rows
      .filter((candidate) => candidate.partyWithId === null && candidate.id !== inviteeId)
      .map((candidate) => ({
        id: candidate.id,
        label: candidate.email ? `${candidate.name} (${candidate.email})` : candidate.name,
      }));

  // Appends a blank invitee (the server picks the next sortOrder and mints a
  // token), then leaves it in place for double-click editing.
  const addInvitee = async () => {
    const response = await fetch('/api/admin/invitees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => null);
    if (!response?.ok) {
      setSendReport('Could not add an invitee.');
      return;
    }
    const { invitee } = (await response.json()) as { invitee: InviteeAdminRow };
    setRows((beforeRows) => [...beforeRows, invitee]);
    setSendReport(`Added “${invitee.name}” — double-click its cells to fill it in`);
  };

  const deleteInvitee = async (inviteeId: string): Promise<boolean> => {
    const response = await fetch(`/api/admin/invitees/${inviteeId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => null);
    if (!response?.ok) return false;
    setRows((beforeRows) => beforeRows.filter((row) => row.id !== inviteeId));
    if (editingInviteeId === inviteeId) setEditingInviteeId(null);
    return true;
  };

  // Drops the dragged column in front of the one it was released on, then
  // writes the new order to the checked-in JSON file.
  const moveColumn = async (movedId: InviteeColumnId, beforeId: InviteeColumnId) => {
    if (movedId === beforeId) return;
    const withoutMoved = columns.filter((id) => id !== movedId);
    const targetIndex = withoutMoved.indexOf(beforeId);
    const nextColumns = [
      ...withoutMoved.slice(0, targetIndex),
      movedId,
      ...withoutMoved.slice(targetIndex),
    ];
    setColumns(nextColumns);
    const response = await fetch('/api/admin/invitee-columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columns: nextColumns }),
    }).catch(() => null);
    setSendReport(
      response?.ok
        ? 'Column order saved to config/inviteeColumnOrder.json — commit it to keep it'
        : 'Column order changed on screen only — saving to inviteeColumnOrder.json failed',
    );
  };

  // Named, so a batch report says which rows to go and look at rather than
  // just how many there were.
  const describeSend = (results: InvitationSendResult[]): string => {
    const sentCount = results.filter((result) => result.sent).length;
    const failures = results.filter((result) => !result.sent);
    if (failures.length === 0) return `${sentCount} sent`;
    const named = failures
      .map((failure) => `${failure.name ?? 'unknown'} (${failure.reason ?? 'unknown'})`)
      .join(' · ');
    return `${sentCount} sent; ${failures.length} skipped/failed — ${named}`;
  };

  // Sends in batches so no single request runs long enough to be cut off, and
  // applies each batch's results as they land: an interrupted run leaves the
  // table showing exactly how far it actually got.
  const dispatchSend = async (inviteeIds: string[], force: boolean): Promise<void> => {
    const allResults: InvitationSendResult[] = [];
    for (let start = 0; start < inviteeIds.length; start += SEND_BATCH_SIZE) {
      const batch = inviteeIds.slice(start, start + SEND_BATCH_SIZE);
      setSendReport(
        inviteeIds.length > SEND_BATCH_SIZE
          ? `Sending ${start + 1}–${Math.min(start + batch.length, inviteeIds.length)} of ${inviteeIds.length}…`
          : 'Sending…',
      );
      const response = await fetch('/api/admin/send-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteeIds: batch, force }),
      }).catch(() => null);
      if (!response?.ok) {
        // A dead request is genuinely ambiguous — the mail may have gone out
        // and been recorded server-side. Stop rather than push on, and say so:
        // the 5-second poll will show what actually landed.
        setSendReport(
          `${describeSend(allResults)} · then the request failed at ${batch.length} more — some of those may have gone out. Wait for the table to refresh before retrying.`,
        );
        return;
      }
      const { results } = (await response.json()) as { results: InvitationSendResult[] };
      allResults.push(...results);
      setRows((beforeRows) =>
        beforeRows.map((row) => {
          const result = results.find((candidate) => candidate.inviteeId === row.id);
          return result?.sent
            ? { ...row, invitationSentAt: result.sentAt ?? row.invitationSentAt }
            : row;
        }),
      );
    }
    setSendReport(describeSend(allResults));
  };

  // One renderer per column id; the header row and every body row walk the same
  // `columns` array, so a drag reorders both at once.
  const renderCell = (columnId: InviteeColumnId, row: InviteeAdminRow): ReactNode => {
    switch (columnId) {
      case 'sortOrder':
        return (
          <td key={columnId} className={`${adminTdClassName} w-12`}>
            <EditableCell
              value={String(row.sortOrder)}
              className={adminMutedClassName}
              onCommit={(nextValue) => {
                const nextSortOrder = Number.parseInt(nextValue, 10);
                if (!Number.isInteger(nextSortOrder)) return Promise.resolve(false);
                return patchInviteeField(row.id, { sortOrder: nextSortOrder });
              }}
            />
          </td>
        );
      case 'side':
        return (
          <td key={columnId} className={adminTdClassName}>
            <EditableCell
              value={row.side}
              onCommit={(nextValue) =>
                nextValue.trim() === ''
                  ? Promise.resolve(false)
                  : patchInviteeField(row.id, { side: nextValue.trim() })
              }
            />
          </td>
        );
      case 'sideBlend':
        return (
          <td key={columnId} className={`${adminTdClassName} w-28`}>
            <EditableCell
              value={String(row.sideBlend)}
              displayValue={formatSideBlend(row.sideBlend)}
              className={adminMutedClassName}
              onCommit={(nextValue) => {
                const nextSideBlend = Number.parseFloat(nextValue);
                if (!Number.isFinite(nextSideBlend) || nextSideBlend < 0 || nextSideBlend > 1) {
                  return Promise.resolve(false);
                }
                return patchInviteeField(row.id, { sideBlend: nextSideBlend });
              }}
            />
          </td>
        );
      case 'name':
        return (
          <td key={columnId} className={adminTdClassName}>
            <EditableCell
              className={adminNameCellClassName}
              value={row.name}
              onCommit={(nextValue) =>
                nextValue.trim() === ''
                  ? Promise.resolve(false)
                  : patchInviteeField(row.id, { name: nextValue.trim() })
              }
            />
          </td>
        );
      case 'partyLink':
        return (
          <td key={columnId} className={adminTdClassName}>
            <GuestPartyLinkSelect
              registeredById={row.partyWithId}
              primaryOptions={partyLinkOptionsForInvitee(row.id)}
              familyCount={rows.filter((candidate) => candidate.partyWithId === row.id).length}
              disabled={rows.some((candidate) => candidate.partyWithId === row.id)}
              onCommit={async (partyWithId) => {
                const saved = await patchInviteeField(row.id, { partyWithId });
                if (!saved) setSendReport('Could not update party link.');
                return saved;
              }}
            />
          </td>
        );
      case 'email': {
        // Two invitees on one address is a real trap rather than a tidiness
        // issue: they each get their own link, and the viewer cookie is
        // last-clicked-wins, so on a shared inbox whoever follows the second
        // link lands on the first one's personalized page.
        const isShared = duplicateEmails.has(normalizedEmail(row));
        const sharedWith = isShared
          ? rows
              .filter(
                (candidate) =>
                  candidate.id !== row.id && normalizedEmail(candidate) === normalizedEmail(row),
              )
              .map((candidate) => candidate.name)
              .join(', ')
          : '';
        return (
          <td key={columnId} className={adminTdClassName}>
            <EditableCell
              className={`${adminEmailCellClassName} ${isShared ? 'text-[#b02020]' : ''}`}
              title={
                isShared
                  ? `Same address as ${sharedWith} — they'd each get their own link, and on a shared inbox the second click overwrites the first person's session. Link them as a party and leave one address blank.`
                  : undefined
              }
              value={row.email ?? ''}
              onCommit={(nextValue) =>
                patchInviteeField(row.id, { email: nextValue.trim() === '' ? null : nextValue.trim() })
              }
            />
          </td>
        );
      }
      case 'note':
        return (
          <td key={columnId} className={`${adminTdClassName} max-w-64 text-sm ${adminMutedClassName}`}>
            <EditableCell
              value={row.note ?? ''}
              placeholder=""
              onCommit={(nextValue) =>
                patchInviteeField(row.id, { note: nextValue.trim() === '' ? null : nextValue })
              }
            />
          </td>
        );
      case 'diagramHovertext': {
        // Unsigned, mid-text line breaks, or a signature from the wrong side:
        // all read as "this one still needs a pass", so they share one colour.
        // A middle blend still waiting on its second signature is orange: worth
        // coming back to, but not the same kind of wrong.
        const issues = hovertextIssues(row);
        const warnings = issues.length > 0 ? [] : sharedSignoffWarnings(row);
        const flags = issues.length > 0 ? issues : warnings;
        return (
          <td key={columnId} className={`${adminTdClassName} max-w-56 text-sm ${adminMutedClassName}`}>
            <EditableCell
              value={row.diagramHovertext ?? ''}
              placeholder=""
              className={issues.length > 0 ? 'text-[#b02020]' : warnings.length > 0 ? 'text-[#c2701c]' : ''}
              title={flags.length > 0 ? flags.join(' · ') : undefined}
              onCommit={(nextValue) =>
                patchInviteeField(row.id, {
                  diagramHovertext: nextValue.trim() === '' ? null : nextValue,
                })
              }
            />
          </td>
        );
      }
      case 'link':
        return (
          <td key={columnId} className={`${adminTdClassName} w-8 text-right`}>
            {row.inviteToken ? (
              <a
                href={`${baseUrl}/invite/${row.inviteToken}`}
                target="_blank"
                rel="noreferrer"
                title="Open this invite link in a new tab"
                className="inline-flex text-[#7a5a1c] transition-opacity hover:opacity-70"
              >
                <LinkIcon />
              </a>
            ) : (
              <span className={adminMutedClassName} title="Run node scripts/seed-invitees.mjs to mint tokens">
                —
              </span>
            )}
          </td>
        );
      case 'invitationLetter':
        return (
          <td key={columnId} className={adminTdClassName}>
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span className={row.invitationHtml ? 'font-medium text-[#2f6b33]' : adminMutedClassName}>
                {row.invitationHtml ? 'written' : hasDefaultInvitation ? 'default' : 'empty'}
              </span>
              <button
                type="button"
                className={adminButtonClassName}
                onClick={() => setEditingInviteeId(editingInviteeId === row.id ? null : row.id)}
              >
                {editingInviteeId === row.id ? 'Close' : 'Edit'}
              </button>
            </span>
          </td>
        );
      case 'sentAt':
        return (
          <td key={columnId} className={`${adminTdClassName} whitespace-nowrap text-sm`}>
            {row.invitationSentAt ? (
              new Date(row.invitationSentAt).toLocaleString()
            ) : (
              <span className={adminMutedClassName}>—</span>
            )}
          </td>
        );
      case 'send':
        return (
          <td key={columnId} className={adminTdClassName}>
            <SendInvitationButton
              label={row.invitationSentAt ? 'Send again' : 'Send'}
              disabled={!readyToSend(row)}
              title={
                readyToSend(row)
                  ? `Email this invitation to ${row.email}`
                  : !hasInvitationEmail
                    ? 'Write the invitation email at the top of this page first'
                    : !row.email
                      ? 'This invitee has no email address'
                      : 'This invitee has no invite token — run scripts/seed-invitees.mjs'
              }
              onSend={() => dispatchSend([row.id], true)}
            />
          </td>
        );
    }
  };

  const sortedRows = useMemo(
    () => [...rows].sort(inviteeComparators(duplicateEmails)[sortBy]),
    [rows, sortBy, duplicateEmails],
  );

  const unsentReadyRows = rows.filter((row) => readyToSend(row) && !row.invitationSentAt);
  const sharedAddressCount = rows.filter((row) => duplicateEmails.has(normalizedEmail(row))).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`text-base ${adminMutedClassName}`}>
          {sendReport ??
            (sharedAddressCount > 0
              ? `${sharedAddressCount} invitees share an address with someone else — see the red email cells before sending`
              : 'double-click a cell to edit; saves on blur · drag a column header to reorder')}
        </span>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold uppercase tracking-wider text-[#7a5a1c]">
          sort by
          <select
            value={sortBy}
            onChange={(changeEvent) => setSortBy(changeEvent.target.value as InviteeSortId)}
            className="cursor-pointer rounded-sm border border-[#b99a5e] bg-white px-2 py-1 text-sm font-medium normal-case tracking-normal text-[#1f1c18]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className={adminTableClassName}>
          <thead>
            <tr>
              {columns.map((columnId) => (
                <th
                  key={columnId}
                  draggable
                  onDragStart={() => setDraggingColumn(columnId)}
                  onDragEnd={() => {
                    setDraggingColumn(null);
                    setDropTargetColumn(null);
                  }}
                  onDragOver={(dragEvent) => {
                    dragEvent.preventDefault();
                    setDropTargetColumn(columnId);
                  }}
                  onDragLeave={() =>
                    setDropTargetColumn((current) => (current === columnId ? null : current))
                  }
                  onDrop={(dropEvent) => {
                    dropEvent.preventDefault();
                    setDropTargetColumn(null);
                    if (draggingColumn) void moveColumn(draggingColumn, columnId);
                    setDraggingColumn(null);
                  }}
                  title="Drag to reorder — the order is saved to config/inviteeColumnOrder.json"
                  className={`${adminThClassName} cursor-grab select-none active:cursor-grabbing ${
                    draggingColumn === columnId ? 'opacity-40' : ''
                  } ${
                    dropTargetColumn === columnId && draggingColumn !== columnId
                      ? 'border-l-2 border-l-[#7a5a1c]'
                      : ''
                  }`}
                >
                  {INVITEE_COLUMN_LABELS[columnId]}
                </th>
              ))}
              {/* Deliberately outside the draggable set: a delete control that
                  wandered under the cursor would be the one column you never
                  want to mis-click. */}
              <th className={`${adminThClassName} w-8`} />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <Fragment key={row.id}>
                <tr>
                  {columns.map((columnId) => renderCell(columnId, row))}
                  <td className={`${adminTdClassName} w-8 text-center`}>
                    <DeleteRowButton
                      label={row.name}
                      description="This deletes the invitee"
                      onDelete={() => deleteInvitee(row.id)}
                    />
                  </td>
                </tr>
                {editingInviteeId === row.id && (
                  <tr>
                    <td className={adminTdClassName} colSpan={columns.length + 1}>
                      <InvitationEditor
                        initialHtml={row.invitationHtml}
                        persist={(invitationHtml) => patchInviteeField(row.id, { invitationHtml })}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <DryRunPanel />
      {/* Both controls live below the table, pushed to opposite corners: the
          send-everything button is the most expensive mis-click on the page, so
          it sits as far from the rows and from "Add a guest" as the row allows. */}
      <div className="flex items-center justify-between gap-3">
        <button type="button" className={adminButtonClassName} onClick={() => void addInvitee()}>
          Add a guest
        </button>
        <SendInvitationButton
          label={`Send all unsent (${unsentReadyRows.length})`}
          disabled={unsentReadyRows.length === 0}
          title="Sends to every invitee with an email, a token, and no send timestamp — once the invitation email is written. Goes out in batches; the server skips anyone already marked sent."
          onSend={() => dispatchSend(unsentReadyRows.map((row) => row.id), false)}
        />
      </div>
    </div>
  );
};

export default InviteesTable;
