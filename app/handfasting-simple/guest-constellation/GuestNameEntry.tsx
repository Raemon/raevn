'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { cormorant } from '../save-the-date/handfastingInvitationTypography';
import type { PartyRegistrationPayload } from './partyRegistrationTypes';
import { usePartyRegistrationDraft } from './usePartyRegistrationDraft';
import { MAX_FAMILY_MEMBERS } from './partyLimits';
import DietCheckboxPair from './DietCheckboxPair';
import FamilyMemberRow from './FamilyMemberRow';

const invitationH3ClassName = `${cormorant.className} m-0 text-[clamp(1.05rem,1.8vw,1.45rem)] font-light italic leading-[1.35] tracking-[0.04em] text-[#cbc4b3]`;

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
  const [isRsvpExpanded, setIsRsvpExpanded] = useState(false);
  const typedGuestNameDraftRef = useRef('');
  typedGuestNameDraftRef.current = typedGuestNameDraft;
  const dialogueRootRef = useRef<HTMLDivElement>(null);
  const guestNameInputRef = useRef<HTMLInputElement>(null);
  const partyDraft = usePartyRegistrationDraft(inviteToken);
  const hasTypedName = typedGuestNameDraft.trim() !== '';
  useEffect(() => {
    if (!isRsvpExpanded) return;
    guestNameInputRef.current?.focus();
  }, [isRsvpExpanded]);
  useEffect(() => {
    if (!isRsvpExpanded) return;
    const relinquishExpandedRsvpUnlessOutsideClickWithEmptyDraft = (pointerDownEvent: PointerEvent) => {
      if (typedGuestNameDraftRef.current.trim() !== '') return;
      const dialogueRootEl = dialogueRootRef.current;
      if (
        dialogueRootEl &&
        pointerDownEvent.target instanceof Node &&
        !dialogueRootEl.contains(pointerDownEvent.target)
      ) {
        setIsRsvpExpanded(false);
      }
    };
    document.addEventListener('pointerdown', relinquishExpandedRsvpUnlessOutsideClickWithEmptyDraft, true);
    return () => {
      document.removeEventListener('pointerdown', relinquishExpandedRsvpUnlessOutsideClickWithEmptyDraft, true);
    };
  }, [isRsvpExpanded]);
  const propagateGuestSubmission = async (submissionEvent: FormEvent) => {
    submissionEvent.preventDefault();
    const enteredNameTrimmed = typedGuestNameDraft.trim();
    if (!enteredNameTrimmed || partyDraft.isSubmitting) return;
    const assembledParty = partyDraft.assemblePartyPayload(enteredNameTrimmed);
    partyDraft.setIsSubmitting(true);
    try {
      await persistGuestThroughConstellationCatalog(assembledParty);
    } catch {
      // Drafts stay intact so the guest can simply try again.
      return;
    } finally {
      partyDraft.setIsSubmitting(false);
    }
    setTypedGuestNameDraft('');
    partyDraft.resetPartyDraft();
  };
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
          className={`flex w-full justify-center transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
            isRsvpExpanded
              ? 'pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 scale-[0.97] opacity-0'
              : 'relative scale-100 opacity-100'
          }`}
        >
          <button
            type="button"
            className={`${invitationH3ClassName} cursor-pointer bg-transparent border border-[#fffff8] rounded-md px-6 py-2 max-w-lg`}
            aria-expanded={false}
            onClick={() => setIsRsvpExpanded(true)}
          >
            Register
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
            <div
              aria-hidden={!hasTypedName}
              inert={!hasTypedName}
              className={`flex w-full flex-col items-center gap-4 overflow-hidden transition-[opacity,max-height] duration-300 ease-out motion-reduce:transition-none ${
                hasTypedName ? 'max-h-[100rem] opacity-100' : 'pointer-events-none max-h-0 opacity-0'
              }`}
            >
              <DietCheckboxPair
                vegan={partyDraft.primaryDiet.vegan}
                vegetarian={partyDraft.primaryDiet.vegetarian}
                onDietChange={partyDraft.setPrimaryDiet}
              />
              {partyDraft.familyDrafts.map((familyDraft) => (
                <FamilyMemberRow
                  key={familyDraft.draftKey}
                  draft={familyDraft}
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
            </div>
            <button
              type="submit"
              disabled={partyDraft.isSubmitting}
              className={`${invitationH3ClassName} cursor-pointer bg-transparent border-none p-0 disabled:cursor-default disabled:opacity-50`}
            >
              Register
            </button>
          </form>
          <div className="text-balance leading-relaxed">
            Register if it would be meaningful to you to participate in Ray and Elizabeth's commitment journey.</div>
        </div>
      </div>
    </div>
  );
};

export default GuestNameEntry;
