'use client';

import { useEffect, useState } from 'react';
import GuestDisplay from './guest-constellation/GuestDisplay';
import GuestNameEntry from './guest-constellation/GuestNameEntry';
import { useGuestConstellation } from './guest-constellation/useGuestConstellation';
import CalendarShortcutRibbon from './save-the-date/CalendarShortcutRibbon';
import SaveTheDateHeroAnnouncement from './save-the-date/SaveTheDateHeroAnnouncement';
import { cormorant, playfair } from './save-the-date/handfastingInvitationTypography';

const Handfasting2 = () => {
  const { guests, persistGuestThroughConstellationCatalog } = useGuestConstellation();
  const [openingPictureOpacity, setOpeningPictureOpacity] = useState(1);
  useEffect(() => {
    const updateOpeningPictureOpacity = () => {
      const scrollY = window.scrollY;
      const fadeSpanPx = window.innerHeight / 2;
      setOpeningPictureOpacity(Math.max(0, 1 - scrollY / fadeSpanPx));
    };
    updateOpeningPictureOpacity();
    window.addEventListener('scroll', updateOpeningPictureOpacity, { passive: true });
    window.addEventListener('resize', updateOpeningPictureOpacity, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateOpeningPictureOpacity);
      window.removeEventListener('resize', updateOpeningPictureOpacity);
    };
  }, []);

  return (
    <main className="relative min-h-svh w-full overflow-hidden text-[#f1ece0] bg-black" aria-label="Ray and Elizabeth at sunset">
      <div
        aria-hidden
        className=" inset-0 z-0 bg-[url('/sunset.jpg')] bg-cover h-[100vh] fixed bg-[center_38%]"
        style={{ opacity: openingPictureOpacity }}
      />
      <div className="relative z-10 box-border flex min-h-svh flex-col items-center justify-center text-center gap-16 text-center w-full">
        <div className="flex flex-col items-center">
          <h1
            className={`${playfair.className} mt-[500px] text-4xl md:text-[clamp(2.2rem,5.4vw,4.2rem)] font-normal italic leading-[1.04] tracking-[0.005em] text-[#f1ece0] mb-4`}
          >
            <span className="text-10xl">10</span> Years <span className=" italic text-[.75em] align-middle mx-1">&amp;</span> <span className="text-10xl">10</span> Days
          </h1>
          <h3
            className={`${cormorant.className} m-0 text-[clamp(1.05rem,1.8vw,1.45rem)] font-light italic leading-[1.35] tracking-[0.04em] text-[#cbc4b3]`}
          >
            Round 2 of an iterated exponential kickstarter of love.
          </h3>
        </div>
        <div className="flex flex-col items-center">
          <GuestNameEntry
            persistGuestThroughConstellationCatalog={persistGuestThroughConstellationCatalog}
            className={`${cormorant.className}`}
          />
        </div>
        <SaveTheDateHeroAnnouncement />
          <CalendarShortcutRibbon />
          <div className="mt-[2.75rem] flex w-full flex-col items-center px-2">
            <GuestDisplay guests={guests} nameClassName={`${playfair.className}`} />
          </div>
      </div>
    </main>
  );
};

export default Handfasting2;
