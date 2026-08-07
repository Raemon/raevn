// Seeds the Invitee table from guestlist.json (gitignored — contains emails).
// Usage: node scripts/seed-invitees.mjs
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const sideBlendFromSide = (side) => {
  if (side === 'elizabeth') return 1;
  if (side === 'ray') return 0;
  return 0.5;
};

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

// guestlist.json is the source for *new* rows only. Once a row exists, the
// admin ledger is authoritative: sortOrder gets hand-arranged there, sideBlend
// hand-tuned away from the 0/0.5/1 the side implies (and the hovertext
// signature checks read that blend), and emails and notes get corrected in
// place. Re-running this used to overwrite all four from a file that is often
// months stale — silently undoing an evening's work.
let created = 0;
let existing = 0;
for (const [i, row] of rows.entries()) {
  const found = await prisma.invitee.findUnique({
    where: { side_name: { side: row.side, name: row.name } },
    select: { id: true },
  });
  if (found) {
    existing++;
    continue;
  }
  await prisma.invitee.create({
    data: {
      side: row.side,
      sideBlend: sideBlendFromSide(row.side),
      name: row.name,
      email: row.email ?? null,
      note: row.note ?? null,
      sortOrder: i,
      inviteToken: randomBytes(16).toString('hex'),
    },
  });
  created++;
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

console.log(
  `Created ${created} invitee(s); left ${existing} existing row(s) untouched — edit those on /admin, not in guestlist.json.`,
);
await prisma.$disconnect();
