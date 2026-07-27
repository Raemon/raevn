import { Inter } from 'next/font/google';

const adminFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign in — Ray & Elizabeth',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className={`${adminFont.className} flex min-h-svh items-center justify-center bg-[#faf8f4] text-[#1f1c18]`}>
      <form method="post" action="/api/admin/session" className="flex w-72 flex-col gap-3 text-center">
        <p className="text-2xl tracking-wide text-[#5f5a51]">This page is for the two of us.</p>
        <input
          type="password"
          name="key"
          autoFocus
          placeholder="admin key"
          className="rounded border border-[#cfc7b6] bg-white px-3 py-2 text-center outline-none focus:border-[#7a5a1c]"
        />
        {error && <p className="text-sm text-[#a04b2e]">That key didn&apos;t match.</p>}
        <button type="submit" className="rounded bg-[#7a5a1c] px-3 py-2 font-medium text-white">
          Sign in
        </button>
      </form>
    </main>
  );
}
