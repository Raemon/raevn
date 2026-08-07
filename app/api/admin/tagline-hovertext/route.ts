import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import { TAGLINE_HOVERTEXT_SETTING_KEY } from '@/lib/taglineHovertext';

// Saves the hovertext behind the hero subtitle's dashed phrase. Clearing the
// field drops the row, which puts the built-in default back.

export const PATCH = withAdmin(async (request: Request) => {
  const body = (await request.json()) as Record<string, unknown>;
  const hovertext =
    typeof body.hovertext === 'string' && body.hovertext.trim() !== ''
      ? body.hovertext.trim()
      : null;
  if (hovertext === null) {
    await prisma.setting.deleteMany({ where: { key: TAGLINE_HOVERTEXT_SETTING_KEY } });
  } else {
    await prisma.setting.upsert({
      where: { key: TAGLINE_HOVERTEXT_SETTING_KEY },
      update: { value: hovertext },
      create: { key: TAGLINE_HOVERTEXT_SETTING_KEY, value: hovertext },
    });
  }
  return NextResponse.json({ ok: true, hovertext });
});
