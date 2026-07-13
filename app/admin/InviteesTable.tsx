'use client';

import { Fragment, useState } from 'react';
import type { InviteeAdminRow } from './adminRowTypes';
import type { InvitationSendResult } from '../api/admin/send-invitations/route';
import {
  adminButtonClassName,
  adminMutedClassName,
  adminTableClassName,
  adminTdClassName,
  adminThClassName,
} from './adminTableStyles';
import CopyInviteLinkButton from './CopyInviteLinkButton';
import EditableCell from './EditableCell';
import InvitationEditor from './InvitationEditor';
import SendInvitationButton from './SendInvitationButton';

const INVITEE_COLUMNS = [
  '#',
  'side',
  'name',
  'email',
  'note',
  'invite link',
  'invitation letter',
  'sent at',
  'send',
] as const;

const readyToSend = (row: InviteeAdminRow): boolean =>
  !!row.email && !!row.inviteToken && !!row.invitationHtml;

const InviteesTable = ({
  invitees,
  baseUrl,
  adminKey,
}: {
  invitees: InviteeAdminRow[];
  baseUrl: string;
  adminKey: string | null;
}) => {
  const [rows, setRows] = useState(invitees);
  const [editingInviteeId, setEditingInviteeId] = useState<string | null>(null);
  const [sendReport, setSendReport] = useState<string | null>(null);

  // Persists one field, then mirrors it locally; a false return reverts the cell.
  const patchInviteeField = async (
    inviteeId: string,
    patch: Partial<InviteeAdminRow>,
  ): Promise<boolean> => {
    const response = await fetch(`/api/admin/invitees/${inviteeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patch, key: adminKey ?? '' }),
    }).catch(() => null);
    if (!response?.ok) return false;
    setRows((beforeRows) =>
      beforeRows.map((row) => (row.id === inviteeId ? { ...row, ...patch } : row)),
    );
    return true;
  };

  const dispatchSend = async (inviteeIds: string[]): Promise<void> => {
    const response = await fetch('/api/admin/send-invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteeIds, key: adminKey ?? '' }),
    }).catch(() => null);
    if (!response?.ok) {
      setSendReport('Send request failed — nothing was recorded as sent.');
      return;
    }
    const { results } = (await response.json()) as { results: InvitationSendResult[] };
    setRows((beforeRows) =>
      beforeRows.map((row) => {
        const result = results.find((candidate) => candidate.inviteeId === row.id);
        return result?.sent ? { ...row, invitationSentAt: result.sentAt ?? row.invitationSentAt } : row;
      }),
    );
    const sentCount = results.filter((result) => result.sent).length;
    const failures = results.filter((result) => !result.sent);
    setSendReport(
      `${sentCount} sent${failures.length > 0 ? `; ${failures.length} skipped/failed: ${failures.map((failure) => failure.reason ?? 'unknown').join(' · ')}` : ''}`,
    );
  };

  const unsentReadyRows = rows.filter((row) => readyToSend(row) && !row.invitationSentAt);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <SendInvitationButton
          label={`Send all unsent (${unsentReadyRows.length})`}
          disabled={unsentReadyRows.length === 0}
          title="Sends to every invitee with an email, a token, a written invitation letter, and no send timestamp"
          onSend={() => dispatchSend(unsentReadyRows.map((row) => row.id))}
        />
        <span className={`text-sm italic ${adminMutedClassName}`}>
          {sendReport ?? 'double-click a cell to edit; saves on blur'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className={adminTableClassName}>
          <thead>
            <tr>
              {INVITEE_COLUMNS.map((column) => (
                <th key={column} className={adminThClassName}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr>
                  <td className={`${adminTdClassName} w-12`}>
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
                  <td className={adminTdClassName}>
                    <EditableCell
                      value={row.side}
                      onCommit={(nextValue) =>
                        nextValue.trim() === ''
                          ? Promise.resolve(false)
                          : patchInviteeField(row.id, { side: nextValue.trim() })
                      }
                    />
                  </td>
                  <td className={`${adminTdClassName} whitespace-nowrap`}>
                    <EditableCell
                      value={row.name}
                      onCommit={(nextValue) =>
                        nextValue.trim() === ''
                          ? Promise.resolve(false)
                          : patchInviteeField(row.id, { name: nextValue.trim() })
                      }
                    />
                  </td>
                  <td className={`${adminTdClassName} font-mono text-xs`}>
                    <EditableCell
                      value={row.email ?? ''}
                      onCommit={(nextValue) =>
                        patchInviteeField(row.id, { email: nextValue.trim() === '' ? null : nextValue.trim() })
                      }
                    />
                  </td>
                  <td className={`${adminTdClassName} max-w-64 text-xs italic ${adminMutedClassName}`}>
                    <EditableCell
                      value={row.note ?? ''}
                      placeholder=""
                      onCommit={(nextValue) =>
                        patchInviteeField(row.id, { note: nextValue.trim() === '' ? null : nextValue })
                      }
                    />
                  </td>
                  <td className={adminTdClassName}>
                    {row.inviteToken ? (
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <CopyInviteLinkButton inviteUrl={`${baseUrl}/invite/${row.inviteToken}`} />
                        <a
                          href={`/invite/${row.inviteToken}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#c9a05e] underline"
                        >
                          open
                        </a>
                      </span>
                    ) : (
                      <span className={adminMutedClassName} title="Run node scripts/seed-invitees.mjs to mint tokens">
                        no token
                      </span>
                    )}
                  </td>
                  <td className={adminTdClassName}>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className={row.invitationHtml ? 'text-[#a4c297]' : adminMutedClassName}>
                        {row.invitationHtml ? 'written' : 'empty'}
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
                  <td className={`${adminTdClassName} whitespace-nowrap text-xs`}>
                    {row.invitationSentAt ? (
                      new Date(row.invitationSentAt).toLocaleString()
                    ) : (
                      <span className={adminMutedClassName}>—</span>
                    )}
                  </td>
                  <td className={adminTdClassName}>
                    <SendInvitationButton
                      label={row.invitationSentAt ? 'Send again' : 'Send'}
                      disabled={!readyToSend(row)}
                      title={
                        readyToSend(row)
                          ? `Email this invitation to ${row.email}`
                          : 'Needs an email, a token, and a written invitation letter'
                      }
                      onSend={() => dispatchSend([row.id])}
                    />
                  </td>
                </tr>
                {editingInviteeId === row.id && (
                  <tr>
                    <td className={adminTdClassName} colSpan={INVITEE_COLUMNS.length}>
                      <InvitationEditor
                        inviteeId={row.id}
                        initialHtml={row.invitationHtml}
                        adminKey={adminKey}
                        onSaved={(invitationHtml) =>
                          setRows((beforeRows) =>
                            beforeRows.map((beforeRow) =>
                              beforeRow.id === row.id ? { ...beforeRow, invitationHtml } : beforeRow,
                            ),
                          )
                        }
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InviteesTable;
