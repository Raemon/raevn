import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthorized } from '@/lib/isAdminAuthorized';
import { DEFAULT_INVITATION_SETTING_KEY } from '@/lib/defaultInvitation';

// Saves the shared default invitation letter edited at the top of /admin.
// An empty editor clears the default entirely.

export async function PATCH(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  if (!isAdminAuthorized(typeof body.key === 'string' ? body.key : undefined)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  const invitationHtml =
    typeof body.invitationHtml === 'string' && body.invitationHtml.trim() !== ''
      ? body.invitationHtml
      : null;
  if (invitationHtml === null) {
    await prisma.setting.deleteMany({ where: { key: DEFAULT_INVITATION_SETTING_KEY } });
  } else {
    await prisma.setting.upsert({
      where: { key: DEFAULT_INVITATION_SETTING_KEY },
      update: { value: invitationHtml },
      create: { key: DEFAULT_INVITATION_SETTING_KEY, value: invitationHtml },
    });
  }
  return NextResponse.json({ ok: true });
}
