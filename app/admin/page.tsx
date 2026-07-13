import { headers } from 'next/headers';
import { Cormorant_Garamond } from 'next/font/google';
import { prisma } from '@/lib/prisma';
import { isAdminAuthorized } from '@/lib/isAdminAuthorized';
import type { GuestAdminRow, InviteeAdminRow } from './adminRowTypes';
import GuestsTable from './GuestsTable';
import InviteesTable from './InviteesTable';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Guest Ledger — Ray & Elizabeth',
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  if (!isAdminAuthorized(key)) {
    return (
      <main className={`${cormorant.className} flex min-h-svh items-center justify-center bg-[#0b0a09] text-[#8a8478]`}>
        <p className="text-2xl italic tracking-wide">This page is for the two of us.</p>
      </main>
    );
  }

  const [invitees, guests] = await Promise.all([
    prisma.invitee.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.guest.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
  ]);

  const headerList = await headers();
  const host = headerList.get('host') ?? 'localhost:3000';
  const protocol =
    headerList.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`;

  const inviteeRows: InviteeAdminRow[] = invitees.map((invitee) => ({
    ...invitee,
    invitationSentAt: invitee.invitationSentAt?.toISOString() ?? null,
  }));
  const guestNameById = new Map(guests.map((guest) => [guest.id, guest.name]));
  const inviteeNameById = new Map(invitees.map((invitee) => [invitee.id, invitee.name]));
  const guestRows: GuestAdminRow[] = guests.map((guest) => ({
    ...guest,
    createdAt: guest.createdAt.toISOString(),
    registeredByName: guest.registeredById ? guestNameById.get(guest.registeredById) ?? null : null,
    inviteeName: guest.inviteeId ? inviteeNameById.get(guest.inviteeId) ?? null : null,
  }));

  return (
    <main className={`${cormorant.className} min-h-svh bg-[#0b0a09] pb-24 text-[#f1ece0]`}>
      <div className="mx-auto max-w-6xl px-6">
        <header className="pb-10 pt-14 text-center">
          <p className="text-sm uppercase tracking-[.35em] text-[#c9a05e]">Ray &amp; Elizabeth</p>
          <h1 className="mt-2 text-5xl font-medium">Guest Ledger</h1>
        </header>

        <section className="mb-14">
          <h2 className="mb-3 border-b border-[#c9a05e]/25 pb-2 text-3xl">
            Invitees <span className="text-xl text-[#c9a05e]">{inviteeRows.length}</span>
          </h2>
          <InviteesTable invitees={inviteeRows} baseUrl={baseUrl} adminKey={key ?? null} />
        </section>

        <section className="mb-14">
          <h2 className="mb-3 border-b border-[#c9a05e]/25 pb-2 text-3xl">
            Registrations <span className="text-xl text-[#c9a05e]">{guestRows.length}</span>
          </h2>
          <GuestsTable guests={guestRows} adminKey={key ?? null} />
        </section>

        <footer className="border-t border-[#c9a05e]/15 pt-5 text-center text-sm italic text-[#6b655a]">
          seeded from guestlist.json via scripts/seed-invitees.mjs — invite tokens mint on seed
        </footer>
      </div>
    </main>
  );
}
