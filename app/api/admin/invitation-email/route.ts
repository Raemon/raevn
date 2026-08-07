import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { EMAIL_KIND_KEYS, isInvitationEmailKind } from '@/lib/invitationEmail';

// Saves the invitation email edited on /admin, or — with kind: 'nudge' — the
// chase-list email. An empty field clears that setting: the subject falls back
// to the built-in one, and an empty invitation body makes every invitee
// un-sendable until something is written again.

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
  const kind = isInvitationEmailKind(body.kind) ? body.kind : 'invitation';
  const { subjectKey, bodyKey } = EMAIL_KIND_KEYS[kind];
  if ('subject' in body) await saveSetting(subjectKey, trimmedOrNull(body.subject));
  if ('bodyHtml' in body) await saveSetting(bodyKey, trimmedOrNull(body.bodyHtml));
  return NextResponse.json({ ok: true });
});
