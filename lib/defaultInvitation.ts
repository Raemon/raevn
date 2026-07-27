import { prisma } from '@/lib/prisma';

export const DEFAULT_INVITATION_SETTING_KEY = 'defaultInvitationHtml';

// The shared invitation letter, used for any invitee without a personal one.
export async function getDefaultInvitationHtml(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: DEFAULT_INVITATION_SETTING_KEY },
  });
  return setting?.value ?? null;
}
