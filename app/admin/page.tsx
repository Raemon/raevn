import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Inter } from 'next/font/google';
import { isAdmin } from '@/lib/auth';
import { getDefaultInvitationHtml } from '@/lib/defaultInvitation';
import { getInvitationEmail } from '@/lib/invitationEmail';
import { readInviteeColumnOrder } from '@/lib/inviteeColumnOrder';
import AdminRowsProvider, { AdminRowCount } from './AdminRowsProvider';
import { loadAdminRows } from './loadAdminRows';
import DefaultInvitationEditor from './DefaultInvitationEditor';
import InvitationEmailEditor from './InvitationEmailEditor';
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

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const [rows, defaultInvitationHtml, invitationEmail, inviteeColumnOrder] = await Promise.all([
    loadAdminRows(),
    getDefaultInvitationHtml(),
    getInvitationEmail(),
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
          <DefaultInvitationEditor initialHtml={defaultInvitationHtml} />
        </section>

        <section className="mx-auto mb-14 max-w-6xl">
          <h2 className="mb-1 text-3xl font-semibold">Invitation email</h2>
          <p className="mb-4 text-base text-[#6f6a61]">
            What the Send buttons below actually mail out — its own text, not the letter above.
          </p>
          <InvitationEmailEditor initialEmail={invitationEmail} />
        </section>

        <AdminRowsProvider
          initialInvitees={rows.invitees}
          initialGuests={rows.guests}
          initialMenuOptions={rows.menuOptions}
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
              hasDefaultInvitation={!!defaultInvitationHtml}
              hasInvitationEmail={!!invitationEmail.bodyHtml}
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
            <GuestsTable />
          </section>

          <section className="mb-14">
            <h2 className="mb-3 border-b border-[#cfc7b6] pb-2 text-3xl font-semibold">
              Menu{' '}
              <span className="text-2xl font-medium text-[#7a5a1c]">
                <AdminRowCount of="menuOptions" />
              </span>
            </h2>
            <MenuOptionsTable />
          </section>
        </AdminRowsProvider>

        <footer className="border-t border-[#ddd6c8] pt-5 text-center text-base text-[#6f6a61]">
          seeded from guestlist.json via scripts/seed-invitees.mjs — invite tokens mint on seed
        </footer>
      </div>
    </main>
  );
}
