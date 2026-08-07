import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { getInvitationEmails, isInvitationEmailKind, type InvitationEmailKind } from '@/lib/invitationEmail';
import { createInvitationTransporter, sendInvitationEmail } from '@/lib/sendInvitationEmail';
import { PUBLIC_SITE_URL } from '@/lib/siteUrl';

export type InvitationSendResult = {
  inviteeId: string;
  name?: string;
  sent: boolean;
  sentAt?: string;
  reason?: string;
};

const PAUSE_BETWEEN_SENDS_MS = 500; // stay well under Gmail burst limits

// A batch of invitees is minutes of SMTP, not seconds, and the platform default
// would cut the request off partway — leaving the browser told the send failed
// while the mail was already gone. The client also chunks its batches, so this
// is the backstop rather than the plan.
export const maxDuration = 300;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Sends invitations only for the explicitly listed invitees. Nothing calls
// this except the Send buttons on /admin — there is no automatic path here.

export const POST = withAdmin(async (request: Request) => {
  const body = (await request.json()) as {
    inviteeIds?: unknown;
    kind?: unknown;
    force?: unknown;
  };
  const inviteeIds = Array.isArray(body.inviteeIds)
    ? body.inviteeIds.filter((candidate): candidate is string => typeof candidate === 'string')
    : [];
  const kind: InvitationEmailKind = isInvitationEmailKind(body.kind) ? body.kind : 'invitation';
  // Resending is a deliberate click on a single row; a batch never re-mails
  // someone whose row already carries a timestamp, whatever the caller's
  // (possibly stale) copy of the ledger believed when it built the list.
  const force = body.force === true;

  const baseUrl = PUBLIC_SITE_URL;
  const emails = await getInvitationEmails();
  // An unwritten nudge falls back to the invitation rather than blocking the
  // chase list entirely; the button on that tab says which one it will send.
  const email = kind === 'nudge' && !emails.nudge.bodyHtml ? emails.invitation : emails[kind];

  const results: InvitationSendResult[] = [];
  const mailer = createInvitationTransporter();
  if ('reason' in mailer) {
    return NextResponse.json({
      results: inviteeIds.map((inviteeId) => ({ inviteeId, sent: false, reason: mailer.reason })),
    });
  }

  try {
    for (const inviteeId of inviteeIds) {
      const invitee = await prisma.invitee.findUnique({ where: { id: inviteeId } });
      if (!invitee) {
        results.push({ inviteeId, sent: false, reason: 'invitee no longer exists' });
        continue;
      }
      const skipReason = !invitee.email
        ? 'no email address'
        : !invitee.inviteToken
          ? 'no invite token'
          : !email.bodyHtml
            ? 'no invitation email body written'
            : !force && invitee.invitationSentAt
              ? 'already sent — use Send again to resend'
              : null;
      if (skipReason || !invitee.email || !email.bodyHtml) {
        results.push({ inviteeId, name: invitee.name, sent: false, reason: skipReason ?? 'not sendable' });
        continue;
      }

      const outcome = await sendInvitationEmail(
        mailer,
        invitee.email,
        { subject: email.subject, bodyHtml: email.bodyHtml },
        { name: invitee.name, inviteUrl: `${baseUrl}/invite/${invitee.inviteToken}` },
      );
      if (outcome.ok) {
        const sentAt = new Date();
        await prisma.invitee.update({ where: { id: inviteeId }, data: { invitationSentAt: sentAt } });
        results.push({ inviteeId, name: invitee.name, sent: true, sentAt: sentAt.toISOString() });
      } else {
        results.push({ inviteeId, name: invitee.name, sent: false, reason: outcome.reason });
      }
      await pause(PAUSE_BETWEEN_SENDS_MS);
    }
  } finally {
    mailer.transporter.close();
  }

  return NextResponse.json({ results });
});
