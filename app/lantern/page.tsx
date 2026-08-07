import RequestLinkButton from './RequestLinkButton';
import { cormorant, playfair } from '../handfasting-simple/save-the-date/handfastingInvitationTypography';

// /lantern with no key: the recovery door. A phone that lost the bookmark can
// ask for the link back without a laptop, a password, or anything typed — it
// arrives by email, which is the one place both of us can already read.

export const metadata = {
  title: 'Lantern',
  robots: { index: false, follow: false, nocache: true },
};

export default function LanternRecoveryPage() {
  return (
    <main
      className={`${cormorant.className} flex min-h-svh flex-col items-center justify-center gap-5 bg-[#0c0b09] px-8 text-center text-[#e9e3d4]`}
    >
      <h1 className={`${playfair.className} m-0 text-2xl font-normal tracking-[0.06em]`}>Lantern</h1>
      <p className="m-0 max-w-xs text-[0.95rem] leading-relaxed text-[#a49c8c]">
        This door needs its key. Send the link to the hosts&rsquo; inboxes and open it from there.
      </p>
      <RequestLinkButton />
    </main>
  );
}
