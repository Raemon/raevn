import nodemailer from 'nodemailer';
import type { Guest } from '@prisma/client';

export const HOST_NOTIFICATION_RECIPIENTS = ['raemon777@gmail.com', 'pktechgirl@gmail.com'];

export const describeRsvp = (rsvp: boolean | null): string =>
  rsvp === true ? 'attending' : rsvp === false ? 'not attending' : 'undecided';

export const describePartyMember = (member: Guest): string => {
  const traits = [
    member.diet as string,
    ...(member.isChildUnder2 ? ['child under 2'] : []),
    ...(member.needsHighChair ? ['needs high chair'] : []),
  ];
  return `- ${member.name} — ${traits.join(', ')}`;
};

const describeNote = (note: string | null): string => (note === null || note === '' ? '(none)' : note);

export const describeGuestRowRevisionChanges = (before: Guest, after: Guest): string[] => {
  const changes: string[] = [];
  if (before.diet !== after.diet) changes.push(`diet: ${before.diet} → ${after.diet}`);
  if (before.name !== after.name) changes.push(`name: ${before.name} → ${after.name}`);
  if (before.note !== after.note) changes.push(`note: ${describeNote(before.note)} → ${describeNote(after.note)}`);
  if (before.isChildUnder2 !== after.isChildUnder2) {
    changes.push(`child under 2: ${before.isChildUnder2 ? 'yes' : 'no'} → ${after.isChildUnder2 ? 'yes' : 'no'}`);
  }
  if (before.needsHighChair !== after.needsHighChair) {
    changes.push(`high chair: ${before.needsHighChair ? 'yes' : 'no'} → ${after.needsHighChair ? 'yes' : 'no'}`);
  }
  return changes;
};

export async function sendHostNotificationEmail(subject: string, lines: string[]): Promise<void> {
  const gmailUser = process.env.GMAIL_NOTIFICATION_USER;
  const gmailAppPassword = process.env.GMAIL_NOTIFICATION_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) {
    console.warn('[sendHostNotificationEmail] GMAIL_NOTIFICATION_USER / GMAIL_NOTIFICATION_APP_PASSWORD not set; skipping email');
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailAppPassword },
  });
  try {
    await transporter.sendMail({
      from: `Handfasting RSVPs <${gmailUser}>`,
      to: HOST_NOTIFICATION_RECIPIENTS.join(', '),
      subject,
      text: lines.join('\n'),
    });
  } catch (sendError) {
    console.error('[sendHostNotificationEmail] Failed to dispatch host notification', sendError);
  }
}
