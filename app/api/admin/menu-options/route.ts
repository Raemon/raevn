import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthorized } from '@/lib/isAdminAuthorized';

// Creates a blank dish for the admin menu table to edit in place.

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isAdminAuthorized(typeof body.key === 'string' ? body.key : undefined)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  const name = typeof body.name === 'string' && body.name.trim() !== '' ? body.name.trim() : 'New dish';
  const menuOption = await prisma.menuOption
    .create({ data: { name, description: '', diet: 'omnivore' } })
    .catch(() => null);
  if (!menuOption) {
    return NextResponse.json({ error: 'Could not create a menu option' }, { status: 409 });
  }
  return NextResponse.json({
    menuOption: { ...menuOption, createdAt: menuOption.createdAt.toISOString() },
  });
}
