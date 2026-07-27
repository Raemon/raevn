'use client';

import { useEffect, useMemo, useState } from 'react';
import Handfasting2 from '../handfasting-simple/Handfasting2';
import GuestTapestry from '../tapestry/GuestTapestry';
import { isTapestryVariant } from '../tapestry/tapestryConfig';
import { groupIntoFamilies } from '../tapestry/tapestryOrdering';
import { createSeededRandom } from '../tapestry/tapestrySeededRandom';
import type { TapestryPerson, TapestryVariant } from '../tapestry/tapestryTypes';
import { cormorant } from '../handfasting-simple/save-the-date/handfastingInvitationTypography';

const VARIANTS: Array<{ key: TapestryVariant; label: string }> = [
  { key: 'knot', label: 'The Handfasting Knot' },
  { key: 'tree', label: 'The Living Tree' },
  { key: 'wreath', label: 'The Woven Wreath' },
];

const ARRIVAL_INTERVAL_MS = 2400;

// RSVPs arrive one party at a time in a fixed pseudo-random order — the same
// every visit, but shuffled across sides the way real replies trickle in.
// The tapestry itself still groups everyone by side, however they arrive.
const buildArrivalSequence = (persons: TapestryPerson[]): TapestryPerson[][] => {
  const parties = groupIntoFamilies(persons).map((family) => family.members);
  const random = createSeededRandom('tapestry-preview-arrival-order');
  for (let i = parties.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [parties[i], parties[j]] = [parties[j], parties[i]];
  }
  return parties;
};

// The page here IS the home page — same component, same hero, same RSVP entry.
// Only the tapestry beneath it is swapped, for the one that plays the whole
// invite list arriving, and the transport for it floats above the page so the
// surface underneath stays pixel-identical to what guests will see.
const TapestryPreviewClient = ({
  persons,
  usingSampleData,
}: {
  persons: TapestryPerson[];
  usingSampleData: boolean;
}) => {
  const [variant, setVariant] = useState<TapestryVariant>('knot');
  const parties = useMemo(() => buildArrivalSequence(persons), [persons]);
  const [arrivedParties, setArrivedParties] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Deep-linkable tabs: /preview?tapestry=tree opens on the tree, and
  // switching updates the URL so a look can be shared as a link.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tapestry');
    if (isTapestryVariant(requested)) setVariant(requested);
  }, []);
  const chooseVariant = (next: TapestryVariant) => {
    setVariant(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tapestry', next);
    window.history.replaceState(null, '', url);
  };

  useEffect(() => {
    if (!playing || arrivedParties >= parties.length) return;
    const timer = setInterval(
      () => setArrivedParties((count) => Math.min(count + 1, parties.length)),
      ARRIVAL_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [playing, arrivedParties >= parties.length, parties.length]);

  const visiblePersons = useMemo(
    () => parties.slice(0, arrivedParties).flat(),
    [parties, arrivedParties],
  );
  const atEnd = arrivedParties >= parties.length;

  const controlClass = `${cormorant.className} rounded-full border border-white/20 px-3 py-1 text-sm leading-none text-[#cbc4b3] transition-colors hover:border-white/45 disabled:opacity-35 disabled:hover:border-white/20`;

  return (
    <>
      <Handfasting2
        tapestrySection={
          /* entrance="single": only the newly arrived strands animate in;
             everyone already woven just gently shifts to make room. */
          <GuestTapestry
            key={variant}
            persons={visiblePersons}
            variant={variant}
            entrance="single"
          />
        }
      />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-2">
        <div className="pointer-events-auto flex w-full max-w-3xl flex-col items-center gap-1.5 rounded-2xl border border-white/15 bg-black/70 px-4 py-2 text-center shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
            {VARIANTS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => chooseVariant(entry.key)}
                className={`${cormorant.className} rounded-full border px-3 py-0.5 text-base tracking-wide transition-colors ${
                  entry.key === variant
                    ? 'border-[#d9b26a] bg-[#d9b26a]/15 text-[#f1ece0]'
                    : 'border-white/20 text-[#cbc4b3] hover:border-white/45'
                }`}
              >
                {entry.label}
              </button>
            ))}
            <span aria-hidden className="mx-1 h-4 w-px bg-white/20" />
            <button
              type="button"
              onClick={() => {
                setArrivedParties(0);
                setPlaying(true);
              }}
              className={controlClass}
              aria-label="Restart from no RSVPs"
            >
              ↺
            </button>
            <button
              type="button"
              onClick={() => setArrivedParties((count) => Math.max(0, count - 1))}
              disabled={arrivedParties === 0}
              className={controlClass}
              aria-label="Remove last arrival"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              disabled={atEnd}
              className={controlClass}
              aria-label={playing ? 'Pause arrivals' : 'Play arrivals'}
            >
              {playing && !atEnd ? '❚❚' : '▶'}
            </button>
            <button
              type="button"
              onClick={() => setArrivedParties((count) => Math.min(parties.length, count + 1))}
              disabled={atEnd}
              className={controlClass}
              aria-label="Next arrival"
            >
              +
            </button>
            <span className={`${cormorant.className} ml-1 text-base tabular-nums text-[#9a937f]`}>
              {visiblePersons.length} of {persons.length} guests
              {usingSampleData ? ' · sample names (invite list not reachable)' : ''}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={parties.length}
            value={arrivedParties}
            onChange={(event) => {
              setArrivedParties(Number(event.target.value));
              setPlaying(false);
            }}
            className="w-full accent-[#d9b26a]"
            aria-label="Scrub through arrivals"
          />
        </div>
      </div>
    </>
  );
};

export default TapestryPreviewClient;
