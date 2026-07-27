import nodemailer from 'nodemailer';
import type { Invitee } from '@prisma/client';

// Sends one invitation. The body is exactly the host-authored content from the
// /admin TipTap editor (the invitee's personal letter or the site default)
// plus the guest's personal link — no generated copy. Only ever called from
// the send-invitations route when a host clicks Send.

export async function sendInvitationEmail(
  invitee: Invitee,
  invitationHtml: string,
  inviteUrl: string,
): Promise<{ ok: boolean; reason?: string }> {
  const gmailUser = process.env.GMAIL_NOTIFICATION_USER;
  const gmailAppPassword = process.env.GMAIL_NOTIFICATION_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) {
    return { ok: false, reason: 'GMAIL_NOTIFICATION_USER / GMAIL_NOTIFICATION_APP_PASSWORD not set' };
  }
  if (!invitee.email) return { ok: false, reason: 'no email on file' };
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailAppPassword },
  });
  try {
    await transporter.sendMail({
      from: `Ray & Elizabeth <${gmailUser}>`,
      to: invitee.email,
      subject: 'An invitation from Ray & Elizabeth',
      html: `${invitationHtml}\n<p><a href="${inviteUrl}">${inviteUrl}</a></p>`,
    });
    return { ok: true };
  } catch (sendError) {
    console.error('[sendInvitationEmail] Failed to send invitation', sendError);
    return { ok: false, reason: 'send failed — see server logs' };
  }
}
