'use client';

import { useEffect, useState } from 'react';
import GuestDisplay from './guest-constellation/GuestDisplay';
import GuestNameEntry from './guest-constellation/GuestNameEntry';
import { useGuestConstellation } from './guest-constellation/useGuestConstellation';
import CalendarShortcutRibbon from './save-the-date/CalendarShortcutRibbon';
import SaveTheDateHeroAnnouncement from './save-the-date/SaveTheDateHeroAnnouncement';
import { cormorant, playfair } from './save-the-date/handfastingInvitationTypography';

// Present when the page was reached through a tokenized invite link.
export type PersonalizedInvitation = {
  inviteeName: string;
  inviteToken: string;
  invitationHtml: string | null;
};

const Handfasting2 = ({ personalization }: { personalization?: PersonalizedInvitation }) => {
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
        {personalization && (
          <div className="flex w-full max-w-xl flex-col items-center gap-4 px-4">
            <p className={`${cormorant.className} m-0 text-[clamp(1.2rem,2vw,1.6rem)] font-light italic tracking-[0.04em] text-[#e9e3d4]`}>
              Dear {personalization.inviteeName},
            </p>
            {personalization.invitationHtml && (
              <div
                className={`${cormorant.className} w-full text-[clamp(1.05rem,1.8vw,1.3rem)] font-light leading-relaxed text-[#e9e3d4] [&_p]:my-3 [&_h1]:text-3xl [&_h2]:text-2xl [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l [&_blockquote]:border-white/30 [&_blockquote]:pl-4 [&_blockquote]:italic`}
                // Host-authored content from the /admin TipTap editor.
                dangerouslySetInnerHTML={{ __html: personalization.invitationHtml }}
              />
            )}
          </div>
        )}
        <div className="flex flex-col items-center">
          <GuestNameEntry
            persistGuestThroughConstellationCatalog={persistGuestThroughConstellationCatalog}
            className={`${cormorant.className}`}
            prefilledGuestName={personalization?.inviteeName}
            inviteToken={personalization?.inviteToken}
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
