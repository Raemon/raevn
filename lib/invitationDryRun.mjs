// Everything the send would check, checked without sending. Pure: it takes the
// ledger and the environment as data and returns findings, so the same code
// backs the Dry run button on /admin and scripts/dry-run-invitations.mjs.
//
// The point is to be boring and complete rather than clever — a wedding
// invitation goes out once, and the failure modes that matter (a malformed
// address, two people on one inbox, a placeholder that silently didn't take)
// are all things you'd rather read in a list than discover in a reply.

import {
  INVITE_LINK_PLACEHOLDER,
  INVITEE_NAME_PLACEHOLDER,
  renderInvitationEmailText,
} from './invitationEmailRender.mjs';

// Deliberately loose, and the same shape the admin table uses: this asks "is
// there an address here at all", so it catches a blank, a bare name, and
// "ask Ray" rather than RFC edge cases.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Consumer Gmail cuts you off at 500 recipients a day, Workspace at 2000. A
// batch that lands near the lower line is worth knowing about before it stops
// halfway through.
const GMAIL_CONSUMER_DAILY_LIMIT = 500;

const normalizedEmail = (invitee) => invitee.email?.trim().toLowerCase() ?? '';

/**
 * @param {{
 *   invitees: Array<{ id: string, name: string, email: string | null, inviteToken: string | null,
 *                     invitationSentAt: unknown, diagramHovertext: string | null }>,
 *   emails: { invitation: { subject: string, bodyHtml: string | null },
 *             nudge: { subject: string, bodyHtml: string | null } },
 *   env: { siteUrl: string, siteUrlFromEnv: boolean, gmailUser: string | null,
 *          hasGmailPassword: boolean, replyTo: string | null, hasAuthSecret: boolean },
 * }} input
 */
export function dryRunInvitations({ invitees, emails, env }) {
  /** @type {Array<{ level: 'blocker' | 'error' | 'warn' | 'ok', title: string, detail: string }>} */
  const findings = [];
  const add = (level, title, detail) => findings.push({ level, title, detail });

  // --- the environment the send runs in -----------------------------------
  if (!env.gmailUser || !env.hasGmailPassword) {
    add('blocker', 'Gmail credentials missing', 'GMAIL_NOTIFICATION_USER / GMAIL_NOTIFICATION_APP_PASSWORD are not both set — every send would fail immediately.');
  } else {
    add('ok', 'Gmail credentials present', `Mail would go out as ${env.gmailUser}.`);
  }
  if (!env.hasAuthSecret) {
    add('blocker', 'AUTH_SECRET missing', 'Invite links would set no cookie, so a guest who clicks through would land back on the locked page.');
  }
  if (!env.replyTo) {
    add('warn', 'No reply-to address', `Replies would go to ${env.gmailUser ?? 'the sending account'}. People do reply to invitations — set INVITATION_REPLY_TO to whichever inbox you actually read.`);
  } else {
    add('ok', 'Reply-to set', `Replies would arrive at ${env.replyTo}.`);
  }
  if (!env.siteUrlFromEnv) {
    add('warn', 'Site URL is the built-in fallback', `NEXT_PUBLIC_SITE_URL is unset, so links would be built against ${env.siteUrl}. That is right for production and a trap when sending from a laptop.`);
  } else {
    add('ok', 'Site URL set', `Links would point at ${env.siteUrl}.`);
  }

  // --- the copy itself -----------------------------------------------------
  for (const [kind, email] of [['Invitation', emails.invitation], ['Nudge', emails.nudge]]) {
    const isNudge = kind === 'Nudge';
    if (!email.bodyHtml) {
      add(
        isNudge ? 'warn' : 'blocker',
        `${kind} email has no body`,
        isNudge
          ? 'A nudge would resend the invitation word for word, which reads as a mail glitch rather than a reminder.'
          : 'Nothing can be sent until something is written on the Invitation text tab.',
      );
      continue;
    }
    if (!email.subject.trim()) {
      add('error', `${kind} email has no subject`, 'An empty subject is a spam signal on its own.');
    }
    if (!email.bodyHtml.includes(INVITE_LINK_PLACEHOLDER)) {
      add('warn', `${kind} email has no ${INVITE_LINK_PLACEHOLDER}`, 'The personal link would be appended at the end of the email rather than placed. If you meant to place it, the placeholder is probably mistyped.');
    }
    if (!email.bodyHtml.includes(INVITEE_NAME_PLACEHOLDER)) {
      add('warn', `${kind} email has no ${INVITEE_NAME_PLACEHOLDER}`, 'The email would go out with no greeting by name, while the page it links to is personalised.');
    }
    // A body that still contains a brace is usually a placeholder that didn't
    // take — {{ link }}, {{Link}}, or one the editor split across two nodes.
    const strayBraces = (email.bodyHtml.match(/\{\{[^}]*\}\}/g) ?? []).filter(
      (found) => found !== INVITE_LINK_PLACEHOLDER && found !== INVITEE_NAME_PLACEHOLDER,
    );
    if (strayBraces.length > 0) {
      add('error', `${kind} email has unrecognised placeholders`, `${strayBraces.join(', ')} would be sent to guests literally. The only two that mean anything are ${INVITE_LINK_PLACEHOLDER} and ${INVITEE_NAME_PLACEHOLDER}.`);
    }
  }

  // --- who would actually receive one --------------------------------------
  const countByEmail = new Map();
  for (const invitee of invitees) {
    const email = normalizedEmail(invitee);
    if (email !== '') countByEmail.set(email, (countByEmail.get(email) ?? 0) + 1);
  }
  const duplicateEmails = new Set(
    [...countByEmail].filter(([, count]) => count > 1).map(([email]) => email),
  );

  const blocked = [];
  const wouldSend = [];
  let alreadySent = 0;
  for (const invitee of invitees) {
    const email = invitee.email?.trim() ?? '';
    if (email === '') blocked.push({ name: invitee.name, reason: 'no email address' });
    else if (!LOOKS_LIKE_EMAIL.test(email)) blocked.push({ name: invitee.name, reason: `"${email}" is not an address` });
    else if (!invitee.inviteToken) blocked.push({ name: invitee.name, reason: 'no invite token' });
    else if (invitee.invitationSentAt) alreadySent += 1;
    else wouldSend.push(invitee);
  }

  add(
    blocked.length > 0 ? 'error' : 'ok',
    `${wouldSend.length} would be sent, ${alreadySent} already sent, ${blocked.length} blocked`,
    blocked.length > 0
      ? blocked.map((row) => `${row.name} — ${row.reason}`).join('\n')
      : 'Every invitee on the ledger is sendable.',
  );

  if (duplicateEmails.size > 0) {
    const sharing = [...duplicateEmails].map((email) => {
      const names = invitees.filter((invitee) => normalizedEmail(invitee) === email).map((invitee) => invitee.name);
      return `${email} — ${names.join(', ')}`;
    });
    add('error', `${duplicateEmails.size} address${duplicateEmails.size === 1 ? '' : 'es'} shared by more than one invitee`, `Each gets their own link, and the viewer cookie is last-clicked-wins: on a shared inbox whoever follows the second link lands on the first person's personalised page. Link them as a party and leave one address blank.\n${sharing.join('\n')}`);
  }

  const missingHovertext = invitees.filter((invitee) => (invitee.diagramHovertext?.trim() ?? '') === '').length;
  if (missingHovertext > 0) {
    add('warn', `${missingHovertext} invitees have no diagram hovertext`, 'They would still receive a working invitation; their name in the tapestry just has nothing to say on hover.');
  }

  if (wouldSend.length > GMAIL_CONSUMER_DAILY_LIMIT - 50) {
    add('warn', 'Close to the Gmail daily cap', `${wouldSend.length} in one run, against a ${GMAIL_CONSUMER_DAILY_LIMIT}/day limit on a consumer account (2000 on Workspace). Split it across two days if this is a personal Gmail.`);
  }

  // --- what one of them would actually look like ---------------------------
  let sample = null;
  const sampleInvitee = wouldSend[0] ?? invitees.find((invitee) => invitee.inviteToken);
  if (sampleInvitee && emails.invitation.bodyHtml) {
    sample = {
      to: sampleInvitee.email,
      subject: emails.invitation.subject,
      text: renderInvitationEmailText(emails.invitation.bodyHtml, {
        name: sampleInvitee.name,
        inviteUrl: `${env.siteUrl}/invite/${sampleInvitee.inviteToken}`,
      }),
    };
  }

  return {
    findings,
    plan: { wouldSend: wouldSend.length, alreadySent, blocked },
    sample,
  };
}

export const DRY_RUN_LEVEL_ORDER = ['blocker', 'error', 'warn', 'ok'];
