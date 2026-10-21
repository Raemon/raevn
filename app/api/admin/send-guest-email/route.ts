import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth';
import { getInvitationEmails } from '@/lib/invitationEmail';
import { createInvitationTransporter, sendInvitationEmail } from '@/lib/sendInvitationEmail';
import { PUBLIC_SITE_URL } from '@/lib/siteUrl';
import { loadAdminRows } from '@/app/admin/loadAdminRows';
import { selectGuestEmailRecipients } from '@/app/admin/guestEmailRecipients';

export type GuestEmailSendResult = { name: string; email: string; sent: boolean; reason?: string };

const PAUSE_BETWEEN_SENDS_MS = 500; // stay well under Gmail burst limits

export const maxDuration = 300;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Sends the Emails-tab email to every registered guest. The recipient list is
// recomputed here from the database rather than taken from the browser, so a
// stale tab can't mail someone who has since been removed.

export const POST = withAdmin(async () => {
  const [{ guests: email }, rows] = await Promise.all([getInvitationEmails(), loadAdminRows()]);
  if (!email.bodyHtml) {
    return NextResponse.json({ ok: false, reason: 'nothing written to send yet', results: [] });
  }
  const { recipients } = selectGuestEmailRecipients(rows.invitees, rows.guests);

  const mailer = createInvitationTransporter();
  if ('reason' in mailer) return NextResponse.json({ ok: false, reason: mailer.reason, results: [] });

  const results: GuestEmailSendResult[] = [];
  try {
    for (const recipient of recipients) {
      const outcome = await sendInvitationEmail(
        mailer,
        recipient.email,
        { subject: email.subject, bodyHtml: email.bodyHtml },
        {
          name: recipient.name,
          inviteUrl: recipient.inviteToken ? `${PUBLIC_SITE_URL}/invite/${recipient.inviteToken}` : PUBLIC_SITE_URL,
        },
      );
      results.push({ name: recipient.name, email: recipient.email, sent: outcome.ok, reason: outcome.reason });
      await pause(PAUSE_BETWEEN_SENDS_MS);
    }
  } finally {
    mailer.transporter.close();
  }

  return NextResponse.json({ ok: true, results });
});
