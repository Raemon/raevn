import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { isCorrectPocketKey } from '@/lib/pocketAccess';
import PocketHovertextEditor from './PocketHovertextEditor';

// /lantern/<key> — the ledger's hovertext column, alone, on a phone. No login
// form: a wrong key 404s exactly like a URL that was never a route, so the path
// gives away nothing about what lives here.

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Lantern',
  robots: { index: false, follow: false, nocache: true },
};

export default async function LanternPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isCorrectPocketKey(key)) notFound();

  const invitees = await prisma.invitee.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, side: true, sideBlend: true, diagramHovertext: true },
  });

  return <PocketHovertextEditor pocketKey={key} initialInvitees={invitees} />;
}
