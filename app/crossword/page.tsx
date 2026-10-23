import { Cormorant_Garamond } from 'next/font/google';
import { crossword, crosswordSvg, type CrosswordEntry } from './crosswordSvg';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

export const metadata = {
  title: 'Crossword — Ray & Elizabeth',
  description: 'The handfasting crossword: solved grid, blank grid, and every answer with its clue, guest and table. Machine-readable at /crossword/data.json.',
};

const EntryList = ({ heading, entries }: { heading: string; entries: CrosswordEntry[] }) => (
  <section>
    <h2 className="mb-4 text-sm uppercase tracking-[.35em] text-[#c9a05e]">{heading}</h2>
    <ol className="space-y-4">
      {entries.map((e) => (
        <li key={`${e.direction}-${e.number}`} className="grid grid-cols-[2.5rem_1fr] gap-x-2">
          <span className="text-right text-[#c9a05e]">{e.number}</span>
          <div>
            <p className="text-xl font-semibold tracking-wider">
              {e.answer}
              {e.answerAsWritten !== e.answer && (
                <span className="ml-2 text-base font-normal tracking-normal text-[#ecedf1]/60">({e.answerAsWritten})</span>
              )}
            </p>
            {e.theme ? (
              <p className="italic text-[#ecedf1]/60">Theme word, no clue</p>
            ) : (
              <>
                <p>{e.clue}</p>
                <p className="text-sm text-[#ecedf1]/60">
                  Clue given to {e.clueGivenTo} · {e.table} table ({e.tableNumber})
                  {e.whoKnows && <> · Who knows: {e.whoKnows}</>}
                </p>
              </>
            )}
          </div>
        </li>
      ))}
    </ol>
  </section>
);

export default function CrosswordPage() {
  const across = crossword.entries.filter((e) => e.direction === 'across');
  const down = crossword.entries.filter((e) => e.direction === 'down');
  const { width, height } = crossword.grid;

  return (
    <main className={`${cormorant.className} min-h-svh bg-[#0b0a09] pb-24 text-[#ecedf1]`}>
      <div className="mx-auto max-w-6xl px-6">
        <header className="pb-8 pt-14 text-center">
          <p className="text-sm uppercase tracking-[.35em] text-[#c9a05e]">Ray &amp; Elizabeth</p>
          <h1 className="mt-2 text-5xl font-medium">Crossword</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#ecedf1]/80">{crossword.howItWorks}</p>
          <p className="mt-4 text-[#ecedf1]/60">
            {width} × {height} grid · {crossword.entries.length} entries · Downloads:{' '}
            <a className="text-[#c9a05e] underline" href="/crossword/data.json">data.json</a>
            {' · '}
            <a className="text-[#c9a05e] underline" href="/crossword/solved.svg">solved.svg</a>
            {' · '}
            <a className="text-[#c9a05e] underline" href="/crossword/blank.svg">blank.svg</a>
          </p>
        </header>

        <section aria-label="Solved grid">
          <div className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: crosswordSvg(true) }} />
        </section>

        <div className="mt-14 grid gap-12 md:grid-cols-2">
          <EntryList heading="Across" entries={across} />
          <EntryList heading="Down" entries={down} />
        </div>

        <section aria-label="Blank grid" className="mt-16">
          <h2 className="mb-4 text-sm uppercase tracking-[.35em] text-[#c9a05e]">Blank grid</h2>
          <div className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: crosswordSvg(false) }} />
        </section>

        <p className="mt-10 text-sm text-[#ecedf1]/50">{crossword.source}</p>
      </div>
    </main>
  );
}
