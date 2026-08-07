import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { getInvitationEmails } from '@/lib/invitationEmail';
import { dryRunInvitations } from '@/lib/invitationDryRun.mjs';
import { PUBLIC_SITE_URL } from '@/lib/siteUrl';

// The Dry run button on the Invitees tab. Same checks as
// scripts/dry-run-invitations.mjs, because it is literally the same module.
// Reads only — nothing here can send anything.

export type DryRunLevel = 'blocker' | 'error' | 'warn' | 'ok';

export type DryRunReport = {
  invitees: number;
  findings: Array<{ level: DryRunLevel; title: string; detail: string }>;
  plan: { wouldSend: number; alreadySent: number; blocked: Array<{ name: string; reason: string }> };
  sample: { to: string | null; subject: string; text: string } | null;
};

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async () => {
  const [invitees, emails] = await Promise.all([
    prisma.invitee.findMany({ orderBy: { sortOrder: 'asc' } }),
    getInvitationEmails(),
  ]);

  const report = dryRunInvitations({
    invitees,
    emails,
    env: {
      siteUrl: PUBLIC_SITE_URL,
      siteUrlFromEnv: !!process.env.NEXT_PUBLIC_SITE_URL,
      gmailUser: process.env.GMAIL_NOTIFICATION_USER ?? null,
      hasGmailPassword: !!process.env.GMAIL_NOTIFICATION_APP_PASSWORD,
      replyTo: process.env.INVITATION_REPLY_TO ?? null,
      hasAuthSecret: !!process.env.AUTH_SECRET,
    },
  });

  return NextResponse.json({ ...report, invitees: invitees.length } satisfies DryRunReport);
});
