import { Cormorant_Garamond } from 'next/font/google';
import { prisma } from '@/lib/prisma';
import { isAdminAuthorized } from '@/lib/isAdminAuthorized';
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

export default async function LettersPage({
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

  const invitees = await prisma.invitee.findMany({ orderBy: { sortOrder: 'asc' } });

  return (
    <main className={`${cormorant.className} min-h-svh bg-[#0b0a09] pb-24 text-[#f1ece0]`}>
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
              adminKey={key ?? null}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
