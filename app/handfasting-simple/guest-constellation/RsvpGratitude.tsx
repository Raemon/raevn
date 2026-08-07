'use client';

import { playfair } from '../save-the-date/handfastingInvitationTypography';

// Shown once an invitation has actually been answered — either way. It mounts
// on the answer landing, so the entrance animation is simply what happens when
// this component appears; nothing here needs to know that it was a click
// rather than a page load that brought it on screen.
//
// The static styles below are the *finished* state of every animation, so the
// reduced-motion rule in globals.css can switch the animations off and leave
// the thank-you sitting there fully arrived.

const RsvpGratitude = () => (
  <div className="handfasting-gratitude relative mt-10 flex w-full flex-col items-center px-4">
    {/* A breath of warm light behind the words, so they read as lit rather
        than merely faded in. */}
    <div
      aria-hidden
      // Centred with margins rather than a translate: the halo's keyframes
      // animate `transform`, which would otherwise overwrite the centring.
      className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto -mt-[6.5rem] h-[13rem] w-[26rem] max-w-[110%] opacity-[0.28]"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(255,241,208,0.5) 0%, rgba(255,241,208,0.12) 42%, transparent 72%)',
        animation: 'handfasting-gratitude-halo 2200ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both',
      }}
    />
    <p
      className={`${playfair.className} relative mt-4 -mb-4 text-[clamp(1.9rem,4.6vw,3rem)] font-normal italic leading-[1.1]`}
      style={{
        letterSpacing: '0.08em',
        // The sheen rides a gradient clipped to the glyphs; at its resting
        // position the bright band has already passed off the end of the word.
        backgroundImage:
          'linear-gradient(100deg, #e3e6eb 32%, #fbfdff 45%, #f2f7ff 50%, #e3e6eb 63%)',
        backgroundSize: '250% 100%',
        backgroundPosition: '260% 0',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        animation: [
          'handfasting-gratitude-settle 1100ms cubic-bezier(0.16, 1, 0.3, 1) both',
          'handfasting-gratitude-sheen 1700ms ease-in-out 620ms both',
        ].join(', '),
      }}
    >
      Thank you!
    </p>
  </div>
);

export default RsvpGratitude;
