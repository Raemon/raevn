'use client';

import { useState } from 'react';
import type { GuestEmailSendResult } from '../api/admin/send-guest-email/route';
import type { InvitationEmail } from '@/lib/invitationEmail';
import { useAdminRows } from './AdminRowsProvider';
import { selectGuestEmailRecipients } from './guestEmailRecipients';
import {
  adminButtonClassName,
  adminEmailCellClassName,
  adminMutedClassName,
  adminNameCellClassName,
  adminTableClassName,
  adminTdClassName,
  adminThClassName,
} from './adminTableStyles';
import InvitationEmailEditor from './InvitationEmailEditor';

// An arbitrary email to everyone registered — logistics, a change of plan, a
// thank-you. Written in the same editor as the invitation, and the list below
// is exactly who Send will mail.

const GuestEmailPanel = ({ initialEmail }: { initialEmail: InvitationEmail }) => {
  const { invitees, guests } = useAdminRows();
  const { recipients, unreachableGuestNames } = selectGuestEmailRecipients(invitees, guests);
  const [isSending, setIsSending] = useState(false);
  const [sendReport, setSendReport] = useState<string | null>(null);

  const sendToAll = async () => {
    if (!window.confirm(`Send the saved email to all ${recipients.length} registered guests?`)) return;
    setIsSending(true);
    setSendReport(null);
    const response = await fetch('/api/admin/send-guest-email', { method: 'POST' }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as
      | { ok?: boolean; reason?: string; results?: GuestEmailSendResult[] }
      | null;
    const results = payload?.results ?? [];
    const failures = results.filter((result) => !result.sent);
    setSendReport(
      !payload
        ? 'Send request failed — some may still have gone out; check the mailbox before retrying.'
        : !payload.ok
          ? `Not sent: ${payload.reason ?? 'unknown'}`
          : failures.length === 0
            ? `Sent to ${results.length} guests.`
            : `Sent ${results.length - failures.length} of ${results.length}. Failed: ${failures.map((failure) => failure.email).join(', ')}`,
    );
    setIsSending(false);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <section className="mb-10">
        <h2 className="mb-1 text-3xl font-semibold">Email to registered guests</h2>
        <p className="mb-4 text-base text-[#6f6a61]">
          Goes to everyone who registered and hasn&rsquo;t said no — one email per invite, so a
          party that registered together gets it once.
        </p>
        <InvitationEmailEditor kind="guests" initialEmail={initialEmail} />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h3 className="m-0 text-xl font-semibold">Recipients ({recipients.length})</h3>
          <span className="grow" />
          <span className={`text-sm ${sendReport?.startsWith('Sent to') ? adminMutedClassName : 'text-[#a33a3a]'}`}>
            {sendReport}
          </span>
          <button
            type="button"
            onClick={() => void sendToAll()}
            disabled={isSending || recipients.length === 0 || !initialEmail.bodyHtml}
            title={initialEmail.bodyHtml ? 'Sends the last saved version' : 'Write and save the email first'}
            className={adminButtonClassName}
          >
            {isSending ? 'Sending…' : `Send to all ${recipients.length}`}
          </button>
        </div>
        <table className={adminTableClassName}>
          <thead>
            <tr>
              <th className={adminThClassName}>Name</th>
              <th className={adminThClassName}>Email</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((recipient) => (
              <tr key={recipient.inviteeId}>
                <td className={adminTdClassName}>
                  <div className={adminNameCellClassName}>{recipient.name}</div>
                </td>
                <td className={`${adminTdClassName} ${adminEmailCellClassName}`}>{recipient.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {unreachableGuestNames.length > 0 && (
          <p className={`mt-3 text-sm ${adminMutedClassName}`}>
            Registered but no email on file, so not included: {unreachableGuestNames.join(', ')}
          </p>
        )}
      </section>
    </div>
  );
};

export default GuestEmailPanel;
