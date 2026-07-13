import { NextResponse } from 'next/server';
import type { Diet } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isAdminAuthorized } from '@/lib/isAdminAuthorized';

// Partial update of host-editable guest fields from admin table cell edits.

const DIET_ALLOWLIST = new Set<string>(['omnivore', 'vegetarian', 'vegan']);

type GuestPatch = {
  name?: string;
  diet?: Diet;
  rsvp?: boolean | null;
  isChildUnder2?: boolean;
  needsHighChair?: boolean;
};

const buildGuestPatch = (body: Record<string, unknown>): GuestPatch => {
  const patch: GuestPatch = {};
  if (typeof body.name === 'string' && body.name.trim() !== '') patch.name = body.name.trim();
  if (typeof body.diet === 'string' && DIET_ALLOWLIST.has(body.diet)) patch.diet = body.diet as Diet;
  if ('rsvp' in body && (body.rsvp === true || body.rsvp === false || body.rsvp === null)) {
    patch.rsvp = body.rsvp;
  }
  if (typeof body.isChildUnder2 === 'boolean') patch.isChildUnder2 = body.isChildUnder2;
  if (typeof body.needsHighChair === 'boolean') patch.needsHighChair = body.needsHighChair;
  return patch;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  if (!isAdminAuthorized(typeof body.key === 'string' ? body.key : undefined)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  const patch = buildGuestPatch(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No editable fields in request' }, { status: 400 });
  }
  const guest = await prisma.guest.update({ where: { id }, data: patch }).catch(() => null);
  if (!guest) {
    return NextResponse.json({ error: 'Update failed' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
