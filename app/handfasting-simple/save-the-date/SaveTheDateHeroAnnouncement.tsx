import CalendarShortcutRibbon from './CalendarShortcutRibbon';
import { cinzel, cormorant, playfair } from './handfastingInvitationTypography';

// Stacks the lyrical beats loved ones skim before reacting or RSVPing softly.

const SaveTheDateHeroAnnouncement = () => (
  <div className="flex flex-col items-center" >
    <p
      className={`${cinzel.className} m-0 pl-[0.45em] text-[clamp(0.74rem,1vw,0.88rem)] font-normal uppercase tracking-[0.45em] text-[#93979f]`}
    >
      save the date
    </p>
    <p
      className={`${playfair.className} mt-[0.65rem] m-0 text-4xl opacity-90 font-normal leading-[1.05] tracking-[0.015em] text-[#ecedf1]`}
    >
      October 24
      <span className="ml-[0.05em] mr-[0.3em] text-[0.5em] [vertical-align:0.6em] italic">th</span>
      <span>2026</span>
    </p>
    <p
      className={`${cormorant.className} mt-6 m-0 text-[clamp(0.95rem,1.45vw,1.2rem)] font-light italic tracking-[0.32em] text-[#c2c6cd]`}
    >
      4:00 pm, Oakland, CA
    </p>
    {/* The vendor row belongs to the time-and-place line, not floating between
        sections — it is the thing you reach for right after reading the when. */}
    <CalendarShortcutRibbon />
  </div>
);

export default SaveTheDateHeroAnnouncement;
