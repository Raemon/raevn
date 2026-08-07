'use client';

import { useEffect, useState, type ReactNode } from 'react';
import GuestNameEntry from './guest-constellation/GuestNameEntry';
import TreeV4Tapestry from '../tapestry/TreeV4Tapestry';
import { guestsToTapestryPersons } from '../tapestry/personAdapters';
import { useGuestConstellation } from './guest-constellation/useGuestConstellation';
import SaveTheDateHeroAnnouncement from './save-the-date/SaveTheDateHeroAnnouncement';
import SaveTheDateFooter from './save-the-date/SaveTheDateFooter';
import { cormorant, playfair } from './save-the-date/handfastingInvitationTypography';
import TaglineHovertext from './TaglineHovertext';
import { DEFAULT_TAGLINE_HOVERTEXT } from '@/lib/taglineHovertextDefault';

// Present when the page was reached through a tokenized invite link.
export type PersonalizedInvitation = {
  inviteeName: string;
  inviteToken: string;
  invitationHtml: string | null;
  side: string;
  sideBlend?: number | null;
  diagramHovertext?: string | null;
};

const Handfasting2 = ({
  personalization,
  tapestrySection,
  taglineHovertext,
}: {
  personalization?: PersonalizedInvitation;
  // The hosts' note behind the dashed phrase in the subtitle, from /admin.
  taglineHovertext?: string | null;
  // /preview renders this very page and swaps in its own tapestry — the one
  // that plays the invite list arriving — so the surface around it stays the
  // real thing rather than a lookalike that can drift.
  tapestrySection?: ReactNode;
}) => {
  const { guests, celebratedPrimaryId, persistGuestThroughConstellationCatalog, retireGuestFromConstellation } =
    useGuestConstellation(
      personalization
        ? {
            side: personalization.side,
            sideBlend: personalization.sideBlend,
            diagramHovertext: personalization.diagramHovertext,
          }
        : undefined,
    );
  const [openingPictureOpacity, setOpeningPictureOpacity] = useState(1);
  // Neither of us gets top billing by default — the coin flip happens after
  // mount so the server and client renders still agree on first paint.
  const [signatureNames, setSignatureNames] = useState('Raymond and Elizabeth');
  useEffect(() => {
    if (Math.random() < 0.5) setSignatureNames('Elizabeth and Raymond');
  }, []);
  useEffect(() => {
    const updateOpeningPictureOpacity = () => {
      const scrollY = window.scrollY;
      // `|| 1` guards zero-height viewports (headless/embedded browsers),
      // where the division otherwise yields NaN opacity.
      const fadeSpanPx = window.innerHeight / 2 || 1;
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
    <main className="relative min-h-svh w-full overflow-hidden text-[#ecedf1] bg-black" aria-label="Ray and Elizabeth at sunset">
      <div
        aria-hidden
        className=" inset-0 z-0 bg-[url('/sunset.jpg')] bg-cover h-[100vh] fixed bg-[center_38%]"
        style={{ opacity: openingPictureOpacity }}
      />
      <div className="relative z-10 box-border flex min-h-svh flex-col items-center justify-center text-center gap-16 text-center w-full">
        {/* px-6 keeps the title and subtitle off the screen edges on phones;
            the 500px drop shrinks with the viewport so short screens still
            land the title on the photo's dark silhouette half. */}
        <div className="flex flex-col items-center px-6">
          <h1
            className={`${playfair.className} mt-[min(500px,60svh)] text-[clamp(1.9rem,9.2vw,2.25rem)] md:text-[clamp(2.2rem,5.4vw,4.2rem)] font-normal italic leading-[1.04] tracking-[0.005em] text-[#ecedf1] mb-4`}
          >
            <span className="text-10xl">10</span> Years <span className=" italic text-[.75em] align-middle mx-1">&amp;</span> <span className="text-10xl">10</span> Days
          </h1>
          <h3
            className={`${cormorant.className} m-0 text-[clamp(1.05rem,1.8vw,1.45rem)] font-light italic leading-[1.35] tracking-[0.04em] text-[#c2c6cd]`}
          >
            Round 2 of an{' '}
            <TaglineHovertext hovertext={taglineHovertext ?? DEFAULT_TAGLINE_HOVERTEXT}>
              iterated superlinear kickstarter of love
            </TaglineHovertext>
            .
          </h3>
        </div>
        {personalization && (
          <div className="mt-12 flex w-full max-w-xl flex-col items-center gap-8 px-4">
            <p className={`${cormorant.className} m-0 text-[clamp(1.2rem,2vw,1.6rem)] font-light italic tracking-[0.04em] text-[#e3e6eb]`}>
              Dear {personalization.inviteeName},
            </p>
            {personalization.invitationHtml && (
              <div
                // The outer margins are zeroed so the letter's own edges sit a
                // single gap away from the salutation and signature, matching
                // the spacing between its paragraphs rather than doubling it.
                className={`${cormorant.className} w-full text-[clamp(1.05rem,1.8vw,1.3rem)] font-light leading-relaxed text-[#e3e6eb] [&_p]:my-8 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-3xl [&_h2]:text-2xl [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l [&_blockquote]:border-white/30 [&_blockquote]:pl-4 [&_blockquote]:italic`}
                // Host-authored content from the /admin TipTap editor.
                dangerouslySetInnerHTML={{ __html: personalization.invitationHtml }}
              />
            )}
            <p className={`${cormorant.className} m-0 text-[clamp(1.05rem,1.8vw,1.3rem)] font-light italic tracking-[0.04em] text-[#e3e6eb]`}>
              &ndash; {signatureNames}
            </p>
          </div>
        )}
        {/* The letter opens a `mt-12` below the title block; the RSVP buttons
            close the same distance below the signature so the letter sits
            evenly framed rather than crowding what follows it. */}
        {/* No invitation, no RSVP: the panel answers on behalf of a named
            invitee, and nobody reaches this page without being one. The two of
            us looking at it without an invite link simply see the rest. */}
        {personalization && (
          <div className="mt-12 flex flex-col items-center">
            <GuestNameEntry
              persistGuestThroughConstellationCatalog={persistGuestThroughConstellationCatalog}
              retireGuestFromConstellation={retireGuestFromConstellation}
              className={`${cormorant.className}`}
              guestName={personalization.inviteeName}
              inviteToken={personalization.inviteToken}
            />
          </div>
        )}
          <div className="mt-[2.75rem] flex w-full flex-col items-center px-2">
            {tapestrySection ?? (
              <TreeV4Tapestry
                persons={guestsToTapestryPersons(guests)}
                entrance={celebratedPrimaryId ? 'single' : 'staggered'}
                celebratePersonId={celebratedPrimaryId}
              />
            )}
          </div>
        {/* The date sits under the tree; invitees get it in a footer band. */}
        {personalization ? (
          <SaveTheDateFooter />
        ) : (
          <div className="mb-40">
            <SaveTheDateHeroAnnouncement />
          </div>
        )}
      </div>
    </main>
  );
};

export default Handfasting2;
