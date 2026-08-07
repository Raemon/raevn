import nodemailer, { type Transporter } from 'nodemailer';
import {
  renderInvitationEmailBody,
  renderInvitationEmailText,
  type InvitationEmailFields,
} from '@/lib/invitationEmail';

// Sends one invitation. The subject and body are exactly what the host wrote in
// the invitation-email form on /admin, plus the guest's personal link — no
// generated copy. Only ever called from the send-invitations route when a host
// clicks Send.

// One transporter for a whole batch. A fresh transport per email means a fresh
// TLS handshake to Gmail per email — a second or two each, which is most of
// what made a send-all run outlast the serverless function.
export const createInvitationTransporter = ():
  | { transporter: Transporter; from: string; replyTo: string }
  | { reason: string } => {
  const gmailUser = process.env.GMAIL_NOTIFICATION_USER;
  const gmailAppPassword = process.env.GMAIL_NOTIFICATION_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) {
    return { reason: 'GMAIL_NOTIFICATION_USER / GMAIL_NOTIFICATION_APP_PASSWORD not set' };
  }
  return {
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailAppPassword },
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
    }),
    from: `Ray & Elizabeth <${gmailUser}>`,
    // People reply to a wedding invitation — "can I bring my mum", "we're away
    // that week". Without this those land in the notification mailbox nobody
    // reads, so replies go wherever INVITATION_REPLY_TO points instead.
    replyTo: process.env.INVITATION_REPLY_TO ?? gmailUser,
  };
};

export async function sendInvitationEmail(
  mailer: { transporter: Transporter; from: string; replyTo: string },
  recipientEmail: string,
  email: { subject: string; bodyHtml: string },
  fields: InvitationEmailFields,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    await mailer.transporter.sendMail({
      from: mailer.from,
      replyTo: mailer.replyTo,
      to: recipientEmail,
      subject: email.subject,
      text: renderInvitationEmailText(email.bodyHtml, fields),
      html: renderInvitationEmailBody(email.bodyHtml, fields),
    });
    return { ok: true };
  } catch (sendError) {
    console.error('[sendInvitationEmail] Failed to send invitation', sendError);
    return { ok: false, reason: 'send failed — see server logs' };
  }
}
