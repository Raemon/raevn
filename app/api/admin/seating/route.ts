import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdmin } from '@/lib/auth';
import {
  parseSeatingChart,
  SEATING_CHART_SETTING_KEY,
  serializeSeatingChart,
  type SeatingTable,
} from '@/lib/seatingChart';

export const dynamic = 'force-dynamic';

const isSeatValue = (seat: unknown): seat is string | null =>
  seat === null || (typeof seat === 'string' && seat.trim() !== '');

const readTables = (body: unknown): SeatingTable[] | null => {
  if (!body || typeof body !== 'object' || !('tables' in body)) return null;
  const tables = (body as { tables: unknown }).tables;
  if (!Array.isArray(tables)) return null;
  const nextTables: SeatingTable[] = [];
  for (const table of tables) {
    if (!table || typeof table !== 'object') return null;
    const id = (table as { id?: unknown }).id;
    const seats = (table as { seats?: unknown }).seats;
    if (typeof id !== 'string' || !Array.isArray(seats) || !seats.every(isSeatValue)) return null;
    nextTables.push({ id, seats: seats.map((seat) => (typeof seat === 'string' ? seat : null)) });
  }
  return nextTables;
};

export const GET = withAdmin(async () => {
  const setting = await prisma.setting.findUnique({ where: { key: SEATING_CHART_SETTING_KEY } });
  return NextResponse.json(
    { tables: parseSeatingChart(setting?.value) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
});

export const PUT = withAdmin(async (request: Request) => {
  const tables = readTables(await request.json().catch(() => null));
  if (!tables) {
    return NextResponse.json({ error: 'Seating chart was not a list of tables' }, { status: 400 });
  }
  await prisma.setting.upsert({
    where: { key: SEATING_CHART_SETTING_KEY },
    update: { value: serializeSeatingChart(tables) },
    create: { key: SEATING_CHART_SETTING_KEY, value: serializeSeatingChart(tables) },
  });
  return NextResponse.json({ ok: true, tables });
});
