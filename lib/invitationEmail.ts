import { prisma } from '@/lib/prisma';
import {
  INVITE_LINK_PLACEHOLDER,
  INVITEE_NAME_PLACEHOLDER,
  renderInvitationEmailBody,
  renderInvitationEmailText,
} from '@/lib/invitationEmailRender.mjs';

// Rendering lives in a plain .mjs module so the dry-run script can render
// exactly what gets sent without a TypeScript loader; re-exported here so the
// app keeps importing everything email-shaped from one place.
export {
  INVITE_LINK_PLACEHOLDER,
  INVITEE_NAME_PLACEHOLDER,
  renderInvitationEmailBody,
  renderInvitationEmailText,
};

// The invitation *email* — its own text, separate from the invitation letter
// that /invite/[token] renders. Edited on /admin; nothing generates copy.
//
// Two of them, actually: the invitation itself, and the nudge sent from the
// Awaiting-reply tab. Resending the invitation verbatim reads as a mail
// glitch rather than a reminder, so the nudge gets its own words — and falls
// back to the invitation only when nobody has written one yet.

export const INVITATION_EMAIL_SUBJECT_KEY = 'invitationEmailSubject';
export const INVITATION_EMAIL_BODY_KEY = 'invitationEmailBodyHtml';
export const NUDGE_EMAIL_SUBJECT_KEY = 'nudgeEmailSubject';
export const NUDGE_EMAIL_BODY_KEY = 'nudgeEmailBodyHtml';

export const DEFAULT_INVITATION_EMAIL_SUBJECT = 'An invitation from Ray & Elizabeth';
export const DEFAULT_NUDGE_EMAIL_SUBJECT = 'Still hoping to hear from you — October 24th';

// A starting draft for the nudge, offered in the editor rather than saved: it
// is prose about your wedding written by someone who isn't you, so it wants a
// pass before it goes anywhere. Nothing sends until it has been read and saved.
//
// It leans on the one thing that makes a wedding reminder land — telling people
// a "no" is genuinely useful — rather than apologising for chasing them.
export const NUDGE_EMAIL_STARTER_DRAFT_HTML = [
  '<p>Hi {{name}},</p>',
  "<p>A little while ago we sent you an invitation to our second Handfasting Ritual — October 24th, 4pm, at the Snow Building in Oakland. We haven't heard back yet, and we know how easily an email slips down the pile.</p>",
  '<p>No pressure in either direction — but an explicit &ldquo;no&rdquo; really is useful to us, since we&rsquo;re working out catering and numbers from the replies. It takes a minute either way.</p>',
  '<p>Your page is still here: {{link}}</p>',
  '<p>With love,<br>Ray &amp; Elizabeth</p>',
].join('');

export type InvitationEmailKind = 'invitation' | 'nudge';

export const isInvitationEmailKind = (value: unknown): value is InvitationEmailKind =>
  value === 'invitation' || value === 'nudge';

// Which setting keys and fallback subject each kind reads and writes.
export const EMAIL_KIND_KEYS: Record<
  InvitationEmailKind,
  { subjectKey: string; bodyKey: string; defaultSubject: string }
> = {
  invitation: {
    subjectKey: INVITATION_EMAIL_SUBJECT_KEY,
    bodyKey: INVITATION_EMAIL_BODY_KEY,
    defaultSubject: DEFAULT_INVITATION_EMAIL_SUBJECT,
  },
  nudge: {
    subjectKey: NUDGE_EMAIL_SUBJECT_KEY,
    bodyKey: NUDGE_EMAIL_BODY_KEY,
    defaultSubject: DEFAULT_NUDGE_EMAIL_SUBJECT,
  },
};

export type InvitationEmail = { subject: string; bodyHtml: string | null };

export async function getInvitationEmails(): Promise<Record<InvitationEmailKind, InvitationEmail>> {
  const keys = Object.values(EMAIL_KIND_KEYS).flatMap(({ subjectKey, bodyKey }) => [
    subjectKey,
    bodyKey,
  ]);
  const settings = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const valueOf = (key: string) => settings.find((setting) => setting.key === key)?.value ?? null;
  const emailFor = (kind: InvitationEmailKind): InvitationEmail => ({
    subject: valueOf(EMAIL_KIND_KEYS[kind].subjectKey) ?? EMAIL_KIND_KEYS[kind].defaultSubject,
    bodyHtml: valueOf(EMAIL_KIND_KEYS[kind].bodyKey),
  });
  return { invitation: emailFor('invitation'), nudge: emailFor('nudge') };
}

export type InvitationEmailFields = { name: string; inviteUrl: string };
