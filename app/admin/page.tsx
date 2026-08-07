import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Inter } from 'next/font/google';
import { isAdmin } from '@/lib/auth';
import { getDefaultInvitationHtml } from '@/lib/defaultInvitation';
import { getInvitationEmails } from '@/lib/invitationEmail';
import { readInviteeColumnOrder } from '@/lib/inviteeColumnOrder';
import AdminRowsProvider, { AdminRowCount } from './AdminRowsProvider';
import { loadAdminRows } from './loadAdminRows';
import AdminTabs from './AdminTabs';
import AwaitingReplyTable, { AwaitingReplyCount } from './AwaitingReplyTable';
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

  const [rows, defaultInvitationHtml, emails, inviteeColumnOrder] = await Promise.all([
    loadAdminRows(),
    getDefaultInvitationHtml(),
    getInvitationEmails(),
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

        <AdminRowsProvider
          initialInvitees={rows.invitees}
          initialGuests={rows.guests}
          initialMenuOptions={rows.menuOptions}
        >
          <AdminTabs
            tabs={[
              {
                id: 'invitees',
                label: 'Invitees',
                count: <AdminRowCount of="invitees" />,
                panel: (
                  <InviteesTable
                    baseUrl={baseUrl}
                    hasDefaultInvitation={!!defaultInvitationHtml}
                    hasInvitationEmail={!!emails.invitation.bodyHtml}
                    columnOrder={inviteeColumnOrder}
                  />
                ),
              },
              {
                id: 'registrations',
                label: 'Registrations',
                count: <AdminRowCount of="guests" />,
                panel: <GuestsTable />,
              },
              {
                id: 'awaiting-reply',
                label: 'Awaiting reply',
                count: <AwaitingReplyCount />,
                panel: <AwaitingReplyTable baseUrl={baseUrl} hasNudgeEmail={!!emails.nudge.bodyHtml} />,
              },
              {
                id: 'menu',
                label: 'Menu',
                count: <AdminRowCount of="menuOptions" />,
                panel: <MenuOptionsTable />,
              },
              {
                id: 'invitation-text',
                label: 'Invitation text',
                panel: (
                  <div className="mx-auto max-w-6xl">
                    <section className="mb-14">
                      <h2 className="mb-1 text-3xl font-semibold">Default invitation</h2>
                      <p className="mb-4 text-base text-[#6f6a61]">
                        Shown exactly as every invite page renders it, unless you write someone a
                        personal letter.
                      </p>
                      <DefaultInvitationEditor initialHtml={defaultInvitationHtml} />
                    </section>

                    <section className="mb-14">
                      <h2 className="mb-1 text-3xl font-semibold">Invitation email</h2>
                      <p className="mb-4 text-base text-[#6f6a61]">
                        What the Send buttons on the Invitees tab actually mail out — its own text,
                        not the letter above.
                      </p>
                      <InvitationEmailEditor kind="invitation" initialEmail={emails.invitation} />
                    </section>

                    <section>
                      <h2 className="mb-1 text-3xl font-semibold">Nudge email</h2>
                      <p className="mb-4 text-base text-[#6f6a61]">
                        What the Awaiting-reply tab sends to people who never answered. Left empty,
                        a nudge resends the invitation above word for word — which reads as a mail
                        glitch rather than a reminder.
                      </p>
                      <InvitationEmailEditor kind="nudge" initialEmail={emails.nudge} />
                    </section>
                  </div>
                ),
              },
            ]}
          />
        </AdminRowsProvider>

        <footer className="border-t border-[#ddd6c8] pt-5 text-center text-base text-[#6f6a61]">
          seeded from guestlist.json via scripts/seed-invitees.mjs — invite tokens mint on seed
        </footer>
      </div>
    </main>
  );
}
