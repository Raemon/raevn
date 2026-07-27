import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import { isAdminAuthorized } from '@/lib/isAdminAuthorized';
import { getDefaultInvitationHtml } from '@/lib/defaultInvitation';
import { readInviteeColumnOrder } from '@/lib/inviteeColumnOrder';
import AdminRowsProvider, { AdminRowCount } from './AdminRowsProvider';
import { loadAdminRows } from './loadAdminRows';
import DefaultInvitationEditor from './DefaultInvitationEditor';
import GuestsTable from './GuestsTable';
import InviteesTable from './InviteesTable';
import MenuOptionsTable from './MenuOptionsTable';

const adminFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
      <main className={`${adminFont.className} flex min-h-svh items-center justify-center bg-[#faf8f4] text-[#5f5a51]`}>
        <p className="text-2xl tracking-wide">This page is for the two of us.</p>
      </main>
    );
  }

  const [rows, defaultInvitationHtml, inviteeColumnOrder] = await Promise.all([
    loadAdminRows(),
    getDefaultInvitationHtml(),
    readInviteeColumnOrder(),
  ]);

  const headerList = await headers();
  const host = headerList.get('host') ?? 'localhost:3000';
  const protocol =
    headerList.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`;

  return (
    <main className={`${adminFont.className} min-h-svh bg-[#faf8f4] pb-24 text-[#1f1c18]`}>
      <div className="w-full px-6">
        <header className="pb-10 pt-14 text-center">
          <p className="text-base font-semibold uppercase tracking-[.35em] text-[#7a5a1c]">Ray &amp; Elizabeth</p>
          <h1 className="mt-2 text-5xl font-semibold">Guest Ledger</h1>
        </header>

        <section className="mx-auto mb-14 max-w-6xl">
          <h2 className="mb-1 text-3xl font-semibold">Default invitation</h2>
          <p className="mb-4 text-base text-[#6f6a61]">
            Shown exactly as every invite page renders it, unless you write someone a personal letter.
          </p>
          <DefaultInvitationEditor initialHtml={defaultInvitationHtml} adminKey={key ?? null} />
        </section>

        <AdminRowsProvider
          initialInvitees={rows.invitees}
          initialGuests={rows.guests}
          initialMenuOptions={rows.menuOptions}
          adminKey={key ?? null}
        >
          <section className="mb-14">
            <h2 className="mb-3 border-b border-[#cfc7b6] pb-2 text-3xl font-semibold">
              Invitees{' '}
              <span className="text-2xl font-medium text-[#7a5a1c]">
                <AdminRowCount of="invitees" />
              </span>
            </h2>
            <InviteesTable
              baseUrl={baseUrl}
              adminKey={key ?? null}
              hasDefaultInvitation={!!defaultInvitationHtml}
              columnOrder={inviteeColumnOrder}
            />
          </section>

          <section className="mb-14">
            <h2 className="mb-3 border-b border-[#cfc7b6] pb-2 text-3xl font-semibold">
              Registrations{' '}
              <span className="text-2xl font-medium text-[#7a5a1c]">
                <AdminRowCount of="guests" />
              </span>
            </h2>
            <GuestsTable adminKey={key ?? null} />
          </section>

          <section className="mb-14">
            <h2 className="mb-3 border-b border-[#cfc7b6] pb-2 text-3xl font-semibold">
              Menu{' '}
              <span className="text-2xl font-medium text-[#7a5a1c]">
                <AdminRowCount of="menuOptions" />
              </span>
            </h2>
            <MenuOptionsTable adminKey={key ?? null} />
          </section>
        </AdminRowsProvider>

        <footer className="border-t border-[#ddd6c8] pt-5 text-center text-base text-[#6f6a61]">
          seeded from guestlist.json via scripts/seed-invitees.mjs — invite tokens mint on seed
        </footer>
      </div>
    </main>
  );
}
