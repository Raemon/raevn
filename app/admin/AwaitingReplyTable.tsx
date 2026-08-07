'use client';

import { useState } from 'react';
import type { InvitationSendResult } from '../api/admin/send-invitations/route';
import { useAdminRows } from './AdminRowsProvider';
import { selectAwaitingReply } from './awaitingReply';
import {
  adminEmailCellClassName,
  adminMutedClassName,
  adminNameCellClassName,
  adminTableClassName,
  adminTdClassName,
  adminThClassName,
} from './adminTableStyles';
import CopyInviteLinkButton from './CopyInviteLinkButton';
import SendInvitationButton from './SendInvitationButton';

// The chase list: everyone who got an invitation email and hasn't registered.
// Read-only apart from the nudge — edits belong on the Invitees tab.

const AWAITING_REPLY_COLUMNS = ['name', 'email', 'sent', 'party', 'link', 'nudge'] as const;

const AwaitingReplyTable = ({ baseUrl }: { baseUrl: string }) => {
  const { invitees, guests, updateInvitees } = useAdminRows();
  const [sendReport, setSendReport] = useState<string | null>(null);
  const rows = selectAwaitingReply(invitees, guests);

  const resend = async (inviteeId: string): Promise<void> => {
    const response = await fetch('/api/admin/send-invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteeIds: [inviteeId] }),
    }).catch(() => null);
    if (!response?.ok) {
      setSendReport('Send request failed — nothing was recorded as sent.');
      return;
    }
    const { results } = (await response.json()) as { results: InvitationSendResult[] };
    updateInvitees((beforeRows) =>
      beforeRows.map((row) => {
        const result = results.find((candidate) => candidate.inviteeId === row.id);
        return result?.sent ? { ...row, invitationSentAt: result.sentAt ?? row.invitationSentAt } : row;
      }),
    );
    const failure = results.find((result) => !result.sent);
    setSendReport(failure ? `Not sent: ${failure.reason ?? 'unknown'}` : 'Sent again.');
  };

  return (
    <div className="flex flex-col gap-3">
      <p className={`text-base ${adminMutedClassName}`}>
        {sendReport ?? 'Invitations that went out and have no registration against them yet.'}
      </p>
      <div className="overflow-x-auto">
        <table className={adminTableClassName}>
          <thead>
            <tr>
              {AWAITING_REPLY_COLUMNS.map((column) => (
                <th key={column} className={adminThClassName}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={adminTdClassName}>
                  <span className={`block ${adminNameCellClassName}`}>{row.name}</span>
                </td>
                <td className={adminTdClassName}>
                  <span className={`block ${adminEmailCellClassName} ${adminMutedClassName}`}>
                    {row.email ?? '—'}
                  </span>
                </td>
                <td className={`${adminTdClassName} whitespace-nowrap text-sm ${adminMutedClassName}`}>
                  {row.invitationSentAt ? new Date(row.invitationSentAt).toLocaleString() : '—'}
                </td>
                <td className={`${adminTdClassName} text-sm`}>
                  {row.partyAnswered ? (
                    <span className="text-[#2f6b33]">someone in their party registered</span>
                  ) : (
                    <span className={adminMutedClassName}>—</span>
                  )}
                </td>
                <td className={adminTdClassName}>
                  {row.inviteToken ? (
                    <CopyInviteLinkButton inviteUrl={`${baseUrl}/invite/${row.inviteToken}`} />
                  ) : (
                    <span className={adminMutedClassName}>—</span>
                  )}
                </td>
                <td className={adminTdClassName}>
                  <SendInvitationButton
                    label="Send again"
                    disabled={!row.email || !row.inviteToken}
                    title={
                      row.email
                        ? `Email the invitation to ${row.email} again`
                        : 'This invitee has no email address'
                    }
                    onSend={() => resend(row.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className={`mt-2 text-base ${adminMutedClassName}`}>
            Everyone who was emailed has registered.
          </p>
        )}
      </div>
    </div>
  );
};

// The tab badge, counting the same rows the table shows.
export const AwaitingReplyCount = () => {
  const { invitees, guests } = useAdminRows();
  return <>{selectAwaitingReply(invitees, guests).length}</>;
};

export default AwaitingReplyTable;
