import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { getInvitationEmail } from '@/lib/invitationEmail';
import { sendInvitationEmail } from '@/lib/sendInvitationEmail';

export type InvitationSendResult = {
  inviteeId: string;
  sent: boolean;
  sentAt?: string;
  reason?: string;
};

const PAUSE_BETWEEN_SENDS_MS = 500; // stay well under Gmail burst limits

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Sends invitations only for the explicitly listed invitees. Nothing calls
// this except the Send buttons on /admin — there is no automatic path here.

export const POST = withAdmin(async (request: Request) => {
  const body = (await request.json()) as { inviteeIds?: unknown; key?: unknown };
  const inviteeIds = Array.isArray(body.inviteeIds)
    ? body.inviteeIds.filter((candidate): candidate is string => typeof candidate === 'string')
    : [];
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const invitationEmail = await getInvitationEmail();
  const results: InvitationSendResult[] = [];
  for (const inviteeId of inviteeIds) {
    const invitee = await prisma.invitee.findUnique({ where: { id: inviteeId } });
    if (!invitee || !invitee.email || !invitee.inviteToken || !invitationEmail.bodyHtml) {
      results.push({ inviteeId, sent: false, reason: 'missing email, token, or invitation email body' });
      continue;
    }
    const outcome = await sendInvitationEmail(
      invitee,
      { subject: invitationEmail.subject, bodyHtml: invitationEmail.bodyHtml },
      `${baseUrl}/invite/${invitee.inviteToken}`,
    );
    if (outcome.ok) {
      const sentAt = new Date();
      await prisma.invitee.update({ where: { id: inviteeId }, data: { invitationSentAt: sentAt } });
      results.push({ inviteeId, sent: true, sentAt: sentAt.toISOString() });
    } else {
      results.push({ inviteeId, sent: false, reason: outcome.reason });
    }
    await pause(PAUSE_BETWEEN_SENDS_MS);
  }
  return NextResponse.json({ results });
});
