'use client';

import { FormEvent, useState } from 'react';
import { cormorant } from '../save-the-date/handfastingInvitationTypography';

const invitationH3ClassName = `${cormorant.className} m-0 text-[clamp(1.05rem,1.8vw,1.45rem)] font-light italic leading-[1.35] tracking-[0.04em] text-[#cbc4b3]`;

const GuestNameEntry = ({
  persistGuestThroughConstellationCatalog,
  className,
}: {
  persistGuestThroughConstellationCatalog: (enteredNameTrimmed: string) => Promise<void>;
  className: string;
}) => {
  const [typedGuestNameDraft, setTypedGuestNameDraft] = useState('');
  const [isRsvpExpanded, setIsRsvpExpanded] = useState(false);
  const propagateGuestSubmission = async (submissionEvent: FormEvent) => {
    submissionEvent.preventDefault();
    const enteredNameTrimmed = typedGuestNameDraft.trim();
    if (!enteredNameTrimmed) return;
    await persistGuestThroughConstellationCatalog(enteredNameTrimmed);
    setTypedGuestNameDraft('');
  };
  return (
    <div
      className={
        isRsvpExpanded
          ? "bg-white/10 p-4 rounded-lg border rounded-md border-white/50 flex flex-col items-center justify-center gap-4 max-w-lg"
          : undefined
      }
    >
      {isRsvpExpanded ? (
        <>
          <button
            type="button"
            className={`${invitationH3ClassName} cursor-pointer bg-transparent border-none p-0`}
            aria-expanded={true}
            onClick={() => setIsRsvpExpanded(false)}
          >
            RSVP
          </button>
          <form onSubmit={propagateGuestSubmission} className="">
            <label className={`${className} sr-only`} htmlFor="handfasting-guest-name">
              Your name
            </label>
            <input
              id="handfasting-guest-name"
              type="text"
              name="guestName"
              value={typedGuestNameDraft}
              onChange={(inputEvent) => setTypedGuestNameDraft(inputEvent.target.value)}
              placeholder="Your name here..."
              autoComplete="name"
              className={`bg-transparent text-center p-3 rounded-sm outline-none border-none text-white/90`}
            />
          </form>
          <div className="text-balance leading-relaxed">
            RSVP if it would be meaningful to you to participate in Ray and Elizabeth's commitment journey.</div>
        </>
      ) : (
        <button
          type="button"
          className={`${invitationH3ClassName} cursor-pointer bg-transparent border border-[#fffff8] rounded-md px-6 py-2 max-w-lg`}
          aria-expanded={false}
          onClick={() => setIsRsvpExpanded(true)}
        >
          RSVP
        </button>
      )}
    </div>
  );
};

export default GuestNameEntry;
