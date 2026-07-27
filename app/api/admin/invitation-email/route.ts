import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { INVITATION_EMAIL_BODY_KEY, INVITATION_EMAIL_SUBJECT_KEY } from '@/lib/invitationEmail';

// Saves the invitation email edited on /admin. An empty field clears that
// setting: the subject falls back to the built-in one, and an empty body
// makes every invitee un-sendable until something is written again.

const saveSetting = async (key: string, value: string | null) => {
  if (value === null) {
    await prisma.setting.deleteMany({ where: { key } });
    return;
  }
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
};

const trimmedOrNull = (candidate: unknown): string | null =>
  typeof candidate === 'string' && candidate.trim() !== '' ? candidate : null;

export const PATCH = withAdmin(async (request: Request) => {
  const body = (await request.json()) as Record<string, unknown>;
  if ('subject' in body) await saveSetting(INVITATION_EMAIL_SUBJECT_KEY, trimmedOrNull(body.subject));
  if ('bodyHtml' in body) await saveSetting(INVITATION_EMAIL_BODY_KEY, trimmedOrNull(body.bodyHtml));
  return NextResponse.json({ ok: true });
});
