import { NextResponse } from 'next/server';
import type { Diet } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';

// Partial update of a dish from admin table cell edits.

const DIET_ALLOWLIST = new Set<string>(['omnivore', 'vegetarian', 'vegan']);

type MenuOptionPatch = {
  name?: string;
  description?: string;
  diet?: Diet;
};

const buildMenuOptionPatch = (body: Record<string, unknown>): MenuOptionPatch => {
  const patch: MenuOptionPatch = {};
  if (typeof body.name === 'string' && body.name.trim() !== '') patch.name = body.name.trim();
  // A description may legitimately be cleared, so an empty string is a real edit.
  if (typeof body.description === 'string') patch.description = body.description.trim();
  if (typeof body.diet === 'string' && DIET_ALLOWLIST.has(body.diet)) patch.diet = body.diet as Diet;
  return patch;
};

export const PATCH = withAdmin(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const patch = buildMenuOptionPatch(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No editable fields in request' }, { status: 400 });
  }
  const menuOption = await prisma.menuOption.update({ where: { id }, data: patch }).catch(() => null);
  if (!menuOption) {
    return NextResponse.json({ error: 'Update failed' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
});

export const DELETE = withAdmin(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const menuOption = await prisma.menuOption.delete({ where: { id } }).catch(() => null);
  if (!menuOption) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
});
