import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';

// Creates a blank dish for the admin menu table to edit in place.

export const POST = withAdmin(async (request: Request) => {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
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
});
