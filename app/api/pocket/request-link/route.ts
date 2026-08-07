import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { pocketKey } from '@/lib/pocketAccess';
import { sendHostNotificationEmail } from '@/lib/hostNotificationEmail';

// Mails the phone editor's secret URL to the two of us. Deliberately open:
// there is nothing to authenticate with on a phone that has lost the link,
// which is the exact situation this exists for. It is safe because the link
// only ever goes to the two hardcoded host addresses — the caller learns
// nothing from the response — so the worst a stranger can do is put a link we
// already own in our own inboxes.

const COOLDOWN_SETTING_KEY = 'lanternLinkEmailedAt';
const COOLDOWN_MS = 10 * 60 * 1000;

export const dynamic = 'force-dynamic';

export async function POST() {
  const lastSent = await prisma.setting.findUnique({ where: { key: COOLDOWN_SETTING_KEY } });
  const lastSentMs = Number(lastSent?.value ?? 0);
  // And that worst case is capped: a stranger holding the button down mails us
  // once every ten minutes, not once a second.
  if (Number.isFinite(lastSentMs) && Date.now() - lastSentMs < COOLDOWN_MS) {
    return NextResponse.json({ ok: true, sent: false });
  }
  await prisma.setting.upsert({
    where: { key: COOLDOWN_SETTING_KEY },
    update: { value: String(Date.now()) },
    create: { key: COOLDOWN_SETTING_KEY, value: String(Date.now()) },
  });

  const headerList = await headers();
  const host = headerList.get('host') ?? 'raevn.love';
  const protocol = headerList.get('x-forwarded-proto') ?? 'https';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`;

  await sendHostNotificationEmail('Hover notes — your phone link', [
    'Open this on your phone to write the tapestry hover notes:',
    '',
    `${baseUrl}/lantern/${pocketKey()}`,
    '',
    'Anyone with this link can edit the hover notes and read the invitee list,',
    'so keep it to the two of us. Rotating AUTH_SECRET (or setting POCKET_KEY)',
    'changes it.',
  ]);
  return NextResponse.json({ ok: true, sent: true });
}
