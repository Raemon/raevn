import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public read of the reception menu: the RSVP diet picker previews each
// diet's dishes on hover. Admin editing stays on /api/admin/menu-options.
export async function GET() {
  const menuOptions = await prisma.menuOption.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { name: true, description: true, diet: true },
  });
  return NextResponse.json(menuOptions);
}
