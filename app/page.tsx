import { prisma } from '@/lib/prisma';
import { getViewerInviteeId, isAdmin } from '@/lib/auth';
import { getDefaultInvitationHtml } from '@/lib/defaultInvitation';
import { getTaglineHovertext } from '@/lib/taglineHovertext';
import Handfasting2 from './handfasting-simple/Handfasting2';
import { cinzel, cormorant, playfair } from './handfasting-simple/save-the-date/handfastingInvitationTypography';

// Reads cookies, and the HTML below differs per viewer — never cacheable.
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Save the date — Ray & Elizabeth',
  robots: { index: false, follow: false },
};

// What the uninvited internet sees: when and where, and nothing about who.
// No RSVP form, no tapestry, no fetch to the guests API.
const LockedShell = () => (
  <main className="relative min-h-svh w-full overflow-hidden bg-black text-[#f1ece0]">
    <div className="inset-0 z-0 bg-[url('/sunset.jpg')] bg-cover h-[100vh] fixed bg-[center_38%]" />
    {/* Content starts below the top 55vh so it sits over the dark silhouette
        half of the sunset photo rather than the bright sky. */}
    <div className="relative z-10 flex min-h-svh flex-col items-center justify-start gap-8 pt-[55vh] pb-16 text-center">
      <h1
        className={`${playfair.className} m-0 text-4xl md:text-[clamp(2.2rem,5.4vw,4.2rem)] font-normal italic leading-[1.04] text-[#f1ece0]`}
      >
        <span className="text-10xl">10</span> Years{' '}
        <span className="italic text-[.75em] align-middle mx-1">&amp;</span>{' '}
        <span className="text-10xl">10</span> Days
      </h1>
      {/* Not SaveTheDateHeroAnnouncement: its calendar ribbon builds hrefs
          that carry the street address, and this page's HTML is public. City
          and date only out here — the address stays behind the cookie. */}
      <div className="flex flex-col items-center">
        <p
          className={`${cinzel.className} m-0 pl-[0.45em] text-[clamp(0.74rem,1vw,0.88rem)] font-normal uppercase tracking-[0.45em] text-[#9a9484]`}
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
      </div>
      <p
        className={`${cormorant.className} m-0 max-w-md px-6 text-[clamp(1rem,1.6vw,1.3rem)] font-light italic leading-[1.5] tracking-[0.04em] text-[#cbc4b3]`}
      >
        Check your email for an invitation to RSVP or update your details.
      </p>
    </div>
  </main>
);

export default async function Page() {
  const inviteeId = await getViewerInviteeId();
  const taglineHovertext = await getTaglineHovertext();
  // A cookie for a since-deleted invitee falls through to the locked shell —
  // deleting the row on /admin is how a link (and its cookie) gets revoked.
  const invitee = inviteeId
    ? await prisma.invitee.findUnique({ where: { id: inviteeId } })
    : null;
  if (!invitee) {
    // The two of us can see the full page without an invite link.
    if (await isAdmin()) return <Handfasting2 taglineHovertext={taglineHovertext} />;
    return <LockedShell />;
  }
  const invitationHtml = invitee.invitationHtml ?? (await getDefaultInvitationHtml());
  return (
    <Handfasting2
      taglineHovertext={taglineHovertext}
      personalization={{
        inviteeName: invitee.name,
        inviteToken: invitee.inviteToken ?? '',
        invitationHtml,
        side: invitee.side,
        sideBlend: invitee.sideBlend,
        diagramHovertext: invitee.diagramHovertext,
      }}
    />
  );
}
