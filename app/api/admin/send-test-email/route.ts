import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth';
import { getInvitationEmails, isInvitationEmailKind, type InvitationEmailKind } from '@/lib/invitationEmail';
import { createInvitationTransporter, sendInvitationEmail } from '@/lib/sendInvitationEmail';
import { PUBLIC_SITE_URL } from '@/lib/siteUrl';

// Sends the invitation (or the nudge) to an address you type in, so the thing
// that lands in a real inbox can be looked at before a hundred of them go out.
// Everything about it is real except the recipient: same subject, same body,
// same placeholder substitution, same HTML-and-text pair.
//
// The link is deliberately a dead token. It proves the URL renders and is
// clickable without handing whoever reads the test a working session as some
// real invitee — a dead token lands on the locked shell, same as a stale one.

const SAMPLE_NAME = 'Sample Guest';
const DEAD_TOKEN = 'test-link-not-a-real-invite';

export const maxDuration = 60;

export const POST = withAdmin(async (request: Request) => {
  const body = (await request.json().catch(() => ({}))) as { to?: unknown; kind?: unknown };
  const to = typeof body.to === 'string' ? body.to.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return NextResponse.json({ ok: false, reason: 'that does not look like an email address' });
  }
  const kind: InvitationEmailKind = isInvitationEmailKind(body.kind) ? body.kind : 'invitation';

  const emails = await getInvitationEmails();
  const email = kind === 'nudge' && !emails.nudge.bodyHtml ? emails.invitation : emails[kind];
  if (!email.bodyHtml) {
    return NextResponse.json({ ok: false, reason: 'nothing written to send yet' });
  }

  const mailer = createInvitationTransporter();
  if ('reason' in mailer) return NextResponse.json({ ok: false, reason: mailer.reason });

  try {
    const outcome = await sendInvitationEmail(
      mailer,
      to,
      { subject: `[TEST] ${email.subject}`, bodyHtml: email.bodyHtml },
      { name: SAMPLE_NAME, inviteUrl: `${PUBLIC_SITE_URL}/invite/${DEAD_TOKEN}` },
    );
    return NextResponse.json({ ok: outcome.ok, reason: outcome.reason });
  } finally {
    mailer.transporter.close();
  }
});
