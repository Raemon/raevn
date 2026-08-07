// Checks everything the send would check, and sends nothing.
// Usage: node scripts/dry-run-invitations.mjs
//
// Reads the same ledger, the same settings, and the same environment the real
// send reads, and runs them through lib/invitationDryRun.mjs — the same module
// behind the Dry run button on /admin, so the two can't disagree.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { dryRunInvitations } from '../lib/invitationDryRun.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// next dev loads .env.local for you; bare node does not.
for (const file of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(path.join(root, file), 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.trim().replace(/^["'](.*)["']$/s, '$1');
    }
  } catch {
    // absent is fine — the checks below report what's missing either way
  }
}

const prisma = new PrismaClient();

const SETTING_KEYS = {
  invitationSubject: 'invitationEmailSubject',
  invitationBody: 'invitationEmailBodyHtml',
  nudgeSubject: 'nudgeEmailSubject',
  nudgeBody: 'nudgeEmailBodyHtml',
};

const [invitees, settings] = await Promise.all([
  prisma.invitee.findMany({ orderBy: { sortOrder: 'asc' } }),
  prisma.setting.findMany({ where: { key: { in: Object.values(SETTING_KEYS) } } }),
]);
const valueOf = (key) => settings.find((setting) => setting.key === key)?.value ?? null;

const report = dryRunInvitations({
  invitees,
  emails: {
    invitation: {
      subject: valueOf(SETTING_KEYS.invitationSubject) ?? 'An invitation from Ray & Elizabeth',
      bodyHtml: valueOf(SETTING_KEYS.invitationBody),
    },
    nudge: {
      subject: valueOf(SETTING_KEYS.nudgeSubject) ?? 'A nudge from Ray & Elizabeth',
      bodyHtml: valueOf(SETTING_KEYS.nudgeBody),
    },
  },
  env: {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://raevn.love',
    siteUrlFromEnv: !!process.env.NEXT_PUBLIC_SITE_URL,
    gmailUser: process.env.GMAIL_NOTIFICATION_USER ?? null,
    hasGmailPassword: !!process.env.GMAIL_NOTIFICATION_APP_PASSWORD,
    replyTo: process.env.INVITATION_REPLY_TO ?? null,
    hasAuthSecret: !!process.env.AUTH_SECRET,
  },
});

const MARK = { blocker: '✖ BLOCKER', error: '✖ ERROR  ', warn: '! WARN   ', ok: '✓ OK     ' };
console.log(`\nDry run — ${invitees.length} invitees on the ledger. Nothing was sent.\n`);
for (const level of ['blocker', 'error', 'warn', 'ok']) {
  for (const finding of report.findings.filter((candidate) => candidate.level === level)) {
    console.log(`${MARK[level]}  ${finding.title}`);
    for (const line of finding.detail.split('\n')) console.log(`             ${line}`);
    console.log('');
  }
}

if (report.sample) {
  console.log('--- what one of them would receive (plain-text part) ---');
  console.log(`To:      ${report.sample.to}`);
  console.log(`Subject: ${report.sample.subject}\n`);
  console.log(report.sample.text);
  console.log('--- end sample ---\n');
}

await prisma.$disconnect();

// Non-zero when something would actually break, so this can gate a real send.
const worst = report.findings.some((finding) => finding.level === 'blocker' || finding.level === 'error');
process.exit(worst ? 1 : 0);
