import { Cormorant_Garamond } from 'next/font/google';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import LetterCard from './LetterCard';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Letters — Ray & Elizabeth',
  robots: { index: false, follow: false },
};

export default async function LettersPage() {
  if (!(await isAdmin())) redirect('/admin/login');

  const invitees = await prisma.invitee.findMany({ orderBy: { sortOrder: 'asc' } });

  return (
    <main className={`${cormorant.className} min-h-svh bg-[#0b0a09] pb-24 text-[#ecedf1]`}>
      <div className="mx-auto max-w-3xl px-6">
        <header className="pb-10 pt-14 text-center">
          <p className="text-sm uppercase tracking-[.35em] text-[#c9a05e]">Ray &amp; Elizabeth</p>
          <h1 className="mt-2 text-5xl font-medium">Letters</h1>
        </header>

        <div className="divide-y divide-[#c9a05e]/10">
          {invitees.map((invitee) => (
            <LetterCard
              key={invitee.id}
              inviteeId={invitee.id}
              name={invitee.name}
              note={invitee.note}
              invitationSentAt={invitee.invitationSentAt?.toISOString() ?? null}
              initialHtml={invitee.invitationHtml}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
