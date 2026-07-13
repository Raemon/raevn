// Seeds the Invitee table from guestlist.json (gitignored — contains emails).
// Usage: node scripts/seed-invitees.mjs
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataPath = path.join(root, 'guestlist.json');

let rows;
try {
  rows = JSON.parse(readFileSync(dataPath, 'utf8'));
} catch {
  console.error(`Missing or unreadable ${dataPath} — this file is gitignored; it only exists on machines where the guest list was compiled.`);
  process.exit(1);
}

const prisma = new PrismaClient();

let upserted = 0;
for (const [i, row] of rows.entries()) {
  const data = {
    side: row.side,
    name: row.name,
    email: row.email ?? null,
    note: row.note ?? null,
    sortOrder: i,
  };
  await prisma.invitee.upsert({
    where: { side_name: { side: row.side, name: row.name } },
    create: { ...data, inviteToken: randomBytes(16).toString('hex') },
    update: data,
  });
  upserted++;
}

// Backfill invite tokens for rows that predate the tokenized-link feature.
const tokenless = await prisma.invitee.findMany({ where: { inviteToken: null }, select: { id: true } });
for (const { id } of tokenless) {
  await prisma.invitee.update({ where: { id }, data: { inviteToken: randomBytes(16).toString('hex') } });
}
if (tokenless.length > 0) console.log(`Minted invite tokens for ${tokenless.length} invitee(s).`);

const stale = await prisma.invitee.count({ where: { sortOrder: { gte: rows.length } } });
if (stale > 0) {
  console.warn(`Note: ${stale} invitee(s) in the DB are not in guestlist.json (renamed or removed rows). Clean up manually if intended.`);
}

console.log(`Upserted ${upserted} invitees.`);
await prisma.$disconnect();
