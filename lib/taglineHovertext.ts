import { prisma } from '@/lib/prisma';
import {
  DEFAULT_TAGLINE_HOVERTEXT,
  TAGLINE_HOVERTEXT_SETTING_KEY,
} from '@/lib/taglineHovertextDefault';

export { DEFAULT_TAGLINE_HOVERTEXT, TAGLINE_HOVERTEXT_SETTING_KEY };

// The note behind the hero subtitle's dashed phrase, as edited on /admin.
export async function getTaglineHovertext(): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { key: TAGLINE_HOVERTEXT_SETTING_KEY },
  });
  return setting?.value ?? DEFAULT_TAGLINE_HOVERTEXT;
}
