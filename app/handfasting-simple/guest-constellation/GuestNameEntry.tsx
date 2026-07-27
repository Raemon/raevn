'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { cormorant } from '../save-the-date/handfastingInvitationTypography';
import type { PartyRegistrationPayload } from './partyRegistrationTypes';
import { usePartyRegistrationDraft } from './usePartyRegistrationDraft';
import { useMenuOptionPreviews } from './useMenuOptionPreviews';
import { MAX_FAMILY_MEMBERS, MAX_GUEST_NOTE_LENGTH } from './partyLimits';
import DietChoiceTrio from './DietChoiceTrio';
import FamilyMemberRow from './FamilyMemberRow';

const invitationH3ClassName = `${cormorant.className} m-0 text-[clamp(1.05rem,1.8vw,1.45rem)] font-light italic leading-[1.35] tracking-[0.04em] text-[#cbc4b3]`;
const rsvpChoiceButtonClassName = `${invitationH3ClassName} cursor-pointer bg-transparent border border-[#fffff8] rounded-md px-6 py-2`;

const GuestNameEntry = ({
  persistGuestThroughConstellationCatalog,
  className,
  prefilledGuestName,
  inviteToken,
}: {
  persistGuestThroughConstellationCatalog: (party: PartyRegistrationPayload) => Promise<void>;
  className: string;
  prefilledGuestName?: string;
  inviteToken?: string;
}) => {
  const [typedGuestNameDraft, setTypedGuestNameDraft] = useState(prefilledGuestName ?? '');
  // Which of the two RSVP buttons opened the panel: true = accepting,
  // false = declining, null = still collapsed to the choice pair.
  const [rsvpIntent, setRsvpIntent] = useState<boolean | null>(null);
  // Set once the RSVP lands, so a decline — which never paints a star — still
  // gets an answer instead of silently resetting the form.
  const [settledRsvp, setSettledRsvp] = useState<boolean | null>(null);
  const typedGuestNameDraftRef = useRef('');
  typedGuestNameDraftRef.current = typedGuestNameDraft;
  const dialogueRootRef = useRef<HTMLDivElement>(null);
  const guestNameInputRef = useRef<HTMLInputElement>(null);
  const partyDraft = usePartyRegistrationDraft(inviteToken);
  const menuOptions = useMenuOptionPreviews();
  // A tokenized invite already knows who this is, so the panel never asks again.
  const isGuestNameAlreadyKnown = (prefilledGuestName ?? '').trim() !== '';
  const hasTypedName = typedGuestNameDraft.trim() !== '';
  const isRsvpExpanded = rsvpIntent !== null;
  const isAcceptingIntent = rsvpIntent === true;
  const noteDraftRef = useRef('');
  noteDraftRef.current = partyDraft.noteDraft;
  useEffect(() => {
    if (!isRsvpExpanded || isGuestNameAlreadyKnown) return;
    guestNameInputRef.current?.focus();
  }, [isRsvpExpanded, isGuestNameAlreadyKnown]);
  useEffect(() => {
    if (!isRsvpExpanded) return;
    const relinquishExpandedRsvpUnlessOutsideClickWithEmptyDraft = (pointerDownEvent: PointerEvent) => {
      // Anything the guest actually authored keeps the panel open; a bare
      // prefilled name is not their input, so it does not count as work.
      if (!isGuestNameAlreadyKnown && typedGuestNameDraftRef.current.trim() !== '') return;
      if (noteDraftRef.current.trim() !== '') return;
      const dialogueRootEl = dialogueRootRef.current;
      if (
        dialogueRootEl &&
        pointerDownEvent.target instanceof Node &&
        !dialogueRootEl.contains(pointerDownEvent.target)
      ) {
        setRsvpIntent(null);
      }
    };
    document.addEventListener('pointerdown', relinquishExpandedRsvpUnlessOutsideClickWithEmptyDraft, true);
    return () => {
      document.removeEventListener('pointerdown', relinquishExpandedRsvpUnlessOutsideClickWithEmptyDraft, true);
    };
  }, [isRsvpExpanded, isGuestNameAlreadyKnown]);
  const propagateGuestSubmission = async (submissionEvent: FormEvent) => {
    submissionEvent.preventDefault();
    const enteredNameTrimmed = typedGuestNameDraft.trim();
    if (!enteredNameTrimmed || partyDraft.isSubmitting || rsvpIntent === null) return;
    const assembledParty = partyDraft.assemblePartyPayload(enteredNameTrimmed, rsvpIntent);
    partyDraft.setIsSubmitting(true);
    try {
      await persistGuestThroughConstellationCatalog(assembledParty);
    } catch {
      // Drafts stay intact so the guest can simply try again.
      return;
    } finally {
      partyDraft.setIsSubmitting(false);
    }
    setSettledRsvp(rsvpIntent);
    setRsvpIntent(null);
    if (!isGuestNameAlreadyKnown) setTypedGuestNameDraft('');
    partyDraft.resetPartyDraft();
  };
  if (settledRsvp !== null) {
    return (
      <p className={`${invitationH3ClassName} max-w-md text-balance text-center`}>
        {settledRsvp
          ? 'Thank you — you are on the list. We are so glad you will be there.'
          : 'Thank you for letting us know. We will miss you, and we are glad you were part of this.'}
      </p>
    );
  }
  return (
    <div
      ref={dialogueRootRef}
      className={`flex max-w-lg flex-col items-center justify-center overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none ${
        isRsvpExpanded ? 'gap-4 rounded-lg rounded-md border border-white/50 bg-white/10 p-4' : ''
      }`}
    >
      <div className="relative flex min-h-[3rem] w-full flex-col items-center justify-center">
        <div
          aria-hidden={isRsvpExpanded}
          inert={isRsvpExpanded}
          className={`flex w-full flex-wrap justify-center gap-4 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
            isRsvpExpanded
              ? 'pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 scale-[0.97] opacity-0'
              : 'relative scale-100 opacity-100'
          }`}
        >
          <button
            type="button"
            className={rsvpChoiceButtonClassName}
            aria-expanded={false}
            onClick={() => setRsvpIntent(true)}
          >
            RSVP Accept
          </button>
          <button
            type="button"
            className={rsvpChoiceButtonClassName}
            aria-expanded={false}
            onClick={() => setRsvpIntent(false)}
          >
            RSVP Decline
          </button>
        </div>
        <div
          aria-hidden={!isRsvpExpanded}
          inert={!isRsvpExpanded}
          className={`flex w-full flex-col items-center justify-center gap-4 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
            isRsvpExpanded
              ? 'relative scale-100 opacity-100 motion-reduce:transform-none'
              : 'pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 scale-[0.97] opacity-0 motion-reduce:transform-none'
          }`}
        >
          <form onSubmit={propagateGuestSubmission} className="flex w-full flex-col items-center gap-4">
            {isGuestNameAlreadyKnown ? (
              <p className={`${invitationH3ClassName} text-center`}>
                {isAcceptingIntent ? 'Attending as' : 'Sending regrets for'} {typedGuestNameDraft}
              </p>
            ) : (
              <>
                <label className={`${className} sr-only`} htmlFor="handfasting-guest-name">
                  Your name
                </label>
                <input
                  ref={guestNameInputRef}
                  id="handfasting-guest-name"
                  type="text"
                  name="guestName"
                  value={typedGuestNameDraft}
                  onChange={(inputEvent) => setTypedGuestNameDraft(inputEvent.target.value)}
                  placeholder="Your name here..."
                  autoComplete="name"
                  className={`bg-transparent text-center p-3 rounded-sm outline-none border-none text-white/90`}
                />
              </>
            )}
            <div
              aria-hidden={!hasTypedName}
              inert={!hasTypedName}
              className={`flex w-full flex-col items-center gap-4 overflow-hidden transition-[opacity,max-height] duration-300 ease-out motion-reduce:transition-none ${
                hasTypedName ? 'max-h-[100rem] opacity-100' : 'pointer-events-none max-h-0 opacity-0'
              }`}
            >
              {/* Only an acceptance needs to know what everyone eats and who
                  else is coming; a decline is just the note. */}
              {isAcceptingIntent && (
                <>
                  <DietChoiceTrio
                    diet={partyDraft.primaryDiet}
                    menuOptions={menuOptions}
                    onDietChange={partyDraft.setPrimaryDiet}
                  />
                  {partyDraft.familyDrafts.map((familyDraft) => (
                    <FamilyMemberRow
                      key={familyDraft.draftKey}
                      draft={familyDraft}
                      menuOptions={menuOptions}
                      onPatch={(patch) => partyDraft.patchFamilyDraft(familyDraft.draftKey, patch)}
                      onDiscard={() => partyDraft.discardFamilyDraft(familyDraft.draftKey)}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={partyDraft.appendFamilyDraft}
                    disabled={partyDraft.familyDrafts.length >= MAX_FAMILY_MEMBERS}
                    className={`${cormorant.className} cursor-pointer rounded-full border border-white/25 bg-transparent px-4 py-1 font-light italic tracking-[0.04em] text-[#cbc4b3] disabled:cursor-default disabled:opacity-40`}
                  >
                    + Add a family member
                  </button>
                </>
              )}
              <label className={`${className} sr-only`} htmlFor="handfasting-guest-note">
                A note for Ray and Elizabeth
              </label>
              <textarea
                id="handfasting-guest-note"
                name="guestNote"
                rows={3}
                maxLength={MAX_GUEST_NOTE_LENGTH}
                value={partyDraft.noteDraft}
                onChange={(inputEvent) => partyDraft.setNoteDraft(inputEvent.target.value)}
                placeholder="A note for us, if you like (optional)..."
                className={`${cormorant.className} w-full resize-none rounded-sm border border-white/20 bg-transparent p-3 text-center font-light italic tracking-[0.02em] text-white/90 outline-none placeholder:text-white/40`}
              />
            </div>
            <button
              type="submit"
              disabled={partyDraft.isSubmitting}
              className={`${invitationH3ClassName} cursor-pointer bg-transparent border-none p-0 disabled:cursor-default disabled:opacity-50`}
            >
              {isAcceptingIntent ? 'Register' : 'Send regrets'}
            </button>
          </form>
          {isAcceptingIntent && (
            <div className="text-balance leading-relaxed">
              Register if it would be meaningful to you to participate in Ray and Elizabeth&apos;s commitment journey.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestNameEntry;
