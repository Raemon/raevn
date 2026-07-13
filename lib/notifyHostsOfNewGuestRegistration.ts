import nodemailer from 'nodemailer';
import type { Guest } from '@prisma/client';

const HOST_NOTIFICATION_RECIPIENTS = ['raemon777@gmail.com', 'pktechgirl@gmail.com'];

const describeRsvp = (rsvp: boolean | null): string =>
  rsvp === true ? 'attending' : rsvp === false ? 'not attending' : 'undecided';

const describePartyMember = (member: Guest): string => {
  const traits = [
    member.diet as string,
    ...(member.isChildUnder2 ? ['child under 2'] : []),
    ...(member.needsHighChair ? ['needs high chair'] : []),
  ];
  return `- ${member.name} — ${traits.join(', ')}`;
};

export async function notifyHostsOfNewGuestRegistration(partyRows: Guest[]): Promise<void> {
  const gmailUser = process.env.GMAIL_NOTIFICATION_USER;
  const gmailAppPassword = process.env.GMAIL_NOTIFICATION_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword) {
    console.warn('[notifyHostsOfNewGuestRegistration] GMAIL_NOTIFICATION_USER / GMAIL_NOTIFICATION_APP_PASSWORD not set; skipping email');
    return;
  }
  const [primary] = partyRows;
  if (!primary) return;
  const familyCount = partyRows.length - 1;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailAppPassword },
  });
  try {
    await transporter.sendMail({
      from: `Handfasting RSVPs <${gmailUser}>`,
      to: HOST_NOTIFICATION_RECIPIENTS.join(', '),
      subject: `New handfasting registration: ${primary.name}${familyCount > 0 ? ` (+${familyCount})` : ''}`,
      text: [
        `${primary.name} just registered for the handfasting (${describeRsvp(primary.rsvp)}).`,
        '',
        'Party:',
        ...partyRows.map(describePartyMember),
      ].join('\n'),
    });
  } catch (sendError) {
    console.error('[notifyHostsOfNewGuestRegistration] Failed to dispatch host notification', sendError);
  }
}
