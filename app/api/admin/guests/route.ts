import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthorized } from '@/lib/isAdminAuthorized';

// Creates a blank registration row for the admin table to edit in place — for
// the people who RSVP by text message instead of through the site.

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isAdminAuthorized(typeof body.key === 'string' ? body.key : undefined)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }
  const name = typeof body.name === 'string' && body.name.trim() !== '' ? body.name.trim() : 'New guest';
  const guest = await prisma.guest
    .create({ data: { name, diet: 'omnivore', meaningful: false, plusOne: '', rsvp: null } })
    .catch(() => null);
  if (!guest) {
    return NextResponse.json({ error: 'Could not create a guest' }, { status: 409 });
  }
  return NextResponse.json({
    guest: {
      ...guest,
      createdAt: guest.createdAt.toISOString(),
      registeredByName: null,
      inviteeName: null,
    },
  });
}
