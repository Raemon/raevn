import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const guests = await prisma.guest.findMany({
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(guests);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  const guest = await prisma.guest.create({
    data: {
      name,
      diet: 'omnivore',
      meaningful: false,
      plusOne: '',
    },
  });
  return NextResponse.json(guest);
}
