import { prisma } from '@/lib/prisma';

// The invitation *email* — its own text, separate from the invitation letter
// that /invite/[token] renders. Edited on /admin; nothing generates copy.

export const INVITATION_EMAIL_SUBJECT_KEY = 'invitationEmailSubject';
export const INVITATION_EMAIL_BODY_KEY = 'invitationEmailBodyHtml';

export const DEFAULT_INVITATION_EMAIL_SUBJECT = 'An invitation from Ray & Elizabeth';

// Where the guest's personal link goes in the body; appended if left out.
export const INVITE_LINK_PLACEHOLDER = '{{link}}';

export type InvitationEmail = { subject: string; bodyHtml: string | null };

export async function getInvitationEmail(): Promise<InvitationEmail> {
  const settings = await prisma.setting.findMany({
    where: { key: { in: [INVITATION_EMAIL_SUBJECT_KEY, INVITATION_EMAIL_BODY_KEY] } },
  });
  const valueOf = (key: string) => settings.find((setting) => setting.key === key)?.value ?? null;
  return {
    subject: valueOf(INVITATION_EMAIL_SUBJECT_KEY) ?? DEFAULT_INVITATION_EMAIL_SUBJECT,
    bodyHtml: valueOf(INVITATION_EMAIL_BODY_KEY),
  };
}

// The link is a plain anchor so it survives every mail client.
export function renderInvitationEmailBody(bodyHtml: string, inviteUrl: string): string {
  const linkHtml = `<p><a href="${inviteUrl}">${inviteUrl}</a></p>`;
  return bodyHtml.includes(INVITE_LINK_PLACEHOLDER)
    ? bodyHtml.replaceAll(INVITE_LINK_PLACEHOLDER, linkHtml)
    : `${bodyHtml}\n${linkHtml}`;
}
