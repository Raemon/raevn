'use client';

import type { ReactNode } from 'react';
import { Cinzel, Cormorant_Garamond, Playfair_Display } from 'next/font/google';
import { Tooltip } from '../handfasting/Tooltip';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'] });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500', '600'], style: ['normal', 'italic'] });
const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '500'] });

const palette = {
  ink: '#f1ece0',
  inkSoft: '#cbc4b3',
  burgundy: '#6e1e2d',
  burgundyAccent: '#c86178',
  navy: '#1f2d4a',
  muted: '#9a9484',
};

const EVENT_TITLE = 'Ray & Elizabeth Handfasting';
const EVENT_DETAILS =
  'Round 2 of an iterated exponential kickstarter of love and trust. Save the date — 4pm PT!';

const googleCalUrl =
  'https://calendar.google.com/calendar/render?action=TEMPLATE' +
  `&text=${encodeURIComponent(EVENT_TITLE)}` +
  '&dates=20261024T230000Z/20261025T020000Z' +
  '&ctz=America/Los_Angeles' +
  `&details=${encodeURIComponent(EVENT_DETAILS)}`;

const outlookUrl =
  'https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent' +
  `&subject=${encodeURIComponent(EVENT_TITLE)}` +
  '&startdt=2026-10-24T16:00:00-07:00&enddt=2026-10-24T19:00:00-07:00' +
  `&body=${encodeURIComponent(EVENT_DETAILS)}`;

const appleIcsUrl = '/ray-elizabeth-handfasting.ics';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="3" className="fill-white stroke-[#dadce0]" />
    <rect x="2" y="2" width="20" height="3" rx="3" className="fill-[#4285F4]" />
    <text x="12" y="17" textAnchor="middle" className="fill-[#4285F4] font-sans text-[9px] font-bold">
      31
    </text>
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="3" className="fill-white" />
    <rect x="2" y="2" width="20" height="6" rx="3" className="fill-[#ff3b30]" />
    <text x="12" y="19" textAnchor="middle" className="fill-[#1a1a1a] font-sans text-[10px] font-bold">
      24
    </text>
  </svg>
);

const OutlookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="3" className="fill-[#0078D4]" />
    <text x="12" y="17" textAnchor="middle" className="fill-white font-serif text-sm font-bold italic">
      O
    </text>
  </svg>
);

const untestedNote = (service: string) => (
  <span className="mt-[0.4rem] block text-[0.82em] opacity-85">
    (We don&rsquo;t use {service} and didn&rsquo;t test this! Hopefully it works!)
  </span>
);

const calendarButtons: {
  label: string;
  href: string;
  icon: ReactNode;
  download?: string;
  tooltip: ReactNode;
}[] = [
  { label: 'Google', href: googleCalUrl, icon: <GoogleIcon />, tooltip: 'Add to Google Calendar' },
  {
    label: 'Apple',
    href: appleIcsUrl,
    icon: <AppleIcon />,
    download: 'ray-elizabeth-handfasting.ics',
    tooltip: (
      <>
        Add to Apple Calendar
        {untestedNote('Apple Calendar')}
      </>
    ),
  },
  {
    label: 'Outlook',
    href: outlookUrl,
    icon: <OutlookIcon />,
    tooltip: (
      <>
        Add to Outlook Calendar
        {untestedNote('Outlook')}
      </>
    ),
  },
];

const Handfasting2 = () => {
  return (
    <main className="relative min-h-svh w-full overflow-hidden text-[#f1ece0]" aria-label="Ray and Elizabeth at sunset">
      <div aria-hidden className="absolute inset-0 z-0 bg-[url('/sunset.jpg')] bg-cover bg-[center_38%]" />
      <div className="relative z-10 box-border flex min-h-svh flex-col items-center justify-center px-5 py-8 text-center">
        <div className="flex flex-col items-center">
          <h1
            className={`${playfair.className} mt-[400px] text-4xl md:text-[clamp(2.2rem,5.4vw,4.2rem)] font-normal italic leading-[1.04] tracking-[0.005em] text-[#f1ece0] mb-4`}
          >
            <span className="text-10xl">10</span> Years <span className=" italic text-[.75em] align-middle mx-1">&amp;</span> <span className="text-10xl">10</span> Days
          </h1>
          <h3
            className={`${cormorant.className} m-0 text-[clamp(1.05rem,1.8vw,1.45rem)] font-light italic leading-[1.35] tracking-[0.04em] text-[#cbc4b3] w-[250px] md:w-full mb-8`}
          >
            Round 2 of an iterated exponential kickstarter of love.
          </h3>
          <p
            className={`${cinzel.className} mt-[2.6rem] m-0 pl-[0.45em] text-[clamp(0.74rem,1vw,0.88rem)] font-normal uppercase tracking-[0.45em] text-[#9a9484]`}
          >
            save the date
          </p>
          <p
            className={`${playfair.className} mt-[0.65rem] m-0 text-4xl opacity-90 font-normal leading-[1.05] tracking-[0.015em] text-[#f1ece0]`}
          >
            October 24
            <span className="ml-[0.05em] mr-[0.3em] text-[0.5em] [vertical-align:0.6em] italic">th</span>
            <span>2026</span>
          </p>
          <p
            className={`${cormorant.className} mt-6 m-0 text-[clamp(0.95rem,1.45vw,1.2rem)] font-light italic tracking-[0.32em] text-[#cbc4b3]`}
          >
            4:00 pm, Oakland, CA
          </p>
          <div className="mt-[1.8rem] flex flex-wrap justify-center gap-[0.55rem]">
            {calendarButtons.map((btn, i) => {
              const accent =
                i === 0 ? palette.burgundy : i === 1 ? palette.inkSoft : palette.navy;
              return (
                <Tooltip key={btn.label} content={btn.tooltip} accentColor={accent} interactive placement="bottom">
                  <a
                    href={btn.href}
                    {...(btn.download ? { download: btn.download } : { target: '_blank', rel: 'noopener noreferrer' })}
                    aria-label={`Add to ${btn.label} Calendar`}
                    className={`${cinzel.className} inline-flex items-center justify-center gap-[0.4rem] px-2 py-[0.35rem] text-[0.7rem] font-normal uppercase tracking-[0.18em] text-[#f1ece0] no-underline`}
                  >
                    {btn.icon}
                  </a>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Handfasting2;
