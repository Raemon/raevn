'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cormorant } from '../save-the-date/handfastingInvitationTypography';
import type { GuestWithOptimistic } from './guestTypes';
import type { PartyRegistrationPayload } from './partyRegistrationTypes';
import { usePartyRegistrationDraft } from './usePartyRegistrationDraft';
import { useMenuOptionPreviews } from './useMenuOptionPreviews';
import { useRecordedPartyAutosave } from './useRecordedPartyAutosave';
import { MAX_FAMILY_MEMBERS, MAX_GUEST_NOTE_LENGTH } from './partyLimits';
import { readOwnRegistration, rememberRecordedGuestId, reviseOwnGuestRow } from './reviseOwnGuestRow';
import { PANEL_CARD_CLASS_NAME } from './panelCard';
import DietChoiceTrio from './DietChoiceTrio';
import FamilyMemberRow from './FamilyMemberRow';
import RsvpGratitude from './RsvpGratitude';

// The RSVP panel. Nobody types their name here: the page is behind an invite
// link, so we already know whose answer this is, and the letter above has
// already said it. The two buttons *are* the RSVP — clicking one records it,
// clicking it again takes it back — and the box underneath is what that answer
// still needs, saving itself as it is edited.

const invitationH3ClassName = `${cormorant.className} m-0 text-[clamp(1.05rem,1.8vw,1.45rem)] font-light italic leading-[1.35] tracking-[0.04em] text-[#cbc4b3]`;
const rsvpChoiceButtonClassName = `${invitationH3ClassName} cursor-pointer bg-transparent border rounded-md px-6 py-2 transition-colors duration-200 motion-reduce:transition-none`;
const quietNoteClassName = `${cormorant.className} m-0 text-center text-[0.9rem] font-light italic text-white/50`;

const fitNoteHeightToContent = (element: HTMLTextAreaElement | null) => {
  if (!element) return;
  element.style.height = 'auto';
  const borderHeight = element.offsetHeight - element.clientHeight;
  element.style.height = `${element.scrollHeight + borderHeight}px`;
};

const GuestNameEntry = ({
  persistGuestThroughConstellationCatalog,
  retireGuestFromConstellation,
  className,
  guestName,
  inviteToken,
}: {
  persistGuestThroughConstellationCatalog: (
    party: PartyRegistrationPayload,
  ) => Promise<GuestWithOptimistic[]>;
  retireGuestFromConstellation: (guestId: string) => Promise<void>;
  className: string;
  guestName: string;
  inviteToken?: string;
}) => {
  // Which of the two RSVP buttons is selected: true = attending, false = not,
  // null = neither. Both buttons stay on screen the whole time.
  const [rsvpIntent, setRsvpIntent] = useState<boolean | null>(null);
  // The answer already in the database, and the primary row holding it.
  const [recordedRsvp, setRecordedRsvp] = useState<boolean | null>(null);
  const [recordedGuestId, setRecordedGuestId] = useState<string | null>(null);
  const [hasRecordingFailed, setHasRecordingFailed] = useState(false);
  // The note this registration holds, as opposed to the one being typed.
  const [savedNote, setSavedNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [hasNoteSaveFailed, setHasNoteSaveFailed] = useState(false);
  const partyDraft = usePartyRegistrationDraft(inviteToken);
  const menuOptions = useMenuOptionPreviews();
  const { adoptRecordedParty, patchFamilyDraft } = partyDraft;
  const markFamilyDraftPersisted = useCallback(
    (draftKey: string, persistedId: string) => patchFamilyDraft(draftKey, { persistedId }),
    [patchFamilyDraft],
  );
  const { autosaveStatus, seedAutosaveBaseline } = useRecordedPartyAutosave({
    recordedGuestId,
    isAttending: recordedRsvp === true,
    diet: partyDraft.primaryDiet,
    familyDrafts: partyDraft.familyDrafts,
    markFamilyDraftPersisted,
  });
  const isAcceptingIntent = rsvpIntent === true;
  const isRsvpExpanded = rsvpIntent !== null;
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    fitNoteHeightToContent(noteInputRef.current);
  }, [partyDraft.noteDraft, isRsvpExpanded]);
  // What the box is showing. While it is open this is simply the current
  // answer; while it collapses it is whatever it was showing a moment ago, so
  // the contents don't change out from under a closing animation. (Written
  // during render on purpose: it is derived from state, so re-rendering with
  // the same state writes the same thing.)
  const shownContentRef = useRef(false);
  const isShowingAttending = isRsvpExpanded ? isAcceptingIntent : shownContentRef.current;
  if (isRsvpExpanded) shownContentRef.current = isShowingAttending;

  // The thank-you belongs to an answer we actually hold, so it waits for the
  // row rather than appearing on the click and taking itself back when the
  // write fails. Switching answers retires the old row before writing the new
  // one, though, and the thank-you must not blink out in that gap: while an
  // answer is in flight it stays as long as it was already there. (Same
  // written-during-render idiom as above, and for the same reason.)
  const wasThankingRef = useRef(false);
  const isThanking =
    rsvpIntent !== null && (recordedRsvp !== null || (partyDraft.isSubmitting && wasThankingRef.current));
  wasThankingRef.current = isThanking;

  // A reloaded page reopens on whatever this invitation last answered, drafts
  // and all, rather than on a blank pair of buttons. A guest who answers before
  // the read comes back owns the panel; the stale answer must not land on top
  // of the one they just gave.
  const hasGuestAnsweredThisVisitRef = useRef(false);
  // Words typed into the panel outrank anything the read brings back: a slow
  // network must not wipe a note mid-sentence.
  const hasGuestEditedDraftsRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    void readOwnRegistration().then((recorded) => {
      if (cancelled || !recorded || hasGuestAnsweredThisVisitRef.current || hasGuestEditedDraftsRef.current) {
        return;
      }
      const { primary, family } = recorded;
      adoptRecordedParty({ diet: primary.diet, note: primary.note ?? '' }, family);
      seedAutosaveBaseline({ isAttending: primary.rsvp === true, diet: primary.diet }, family);
      setSavedNote(primary.note ?? '');
      rememberRecordedGuestId(primary.id);
      setRecordedGuestId(primary.id);
      setRecordedRsvp(primary.rsvp);
      setRsvpIntent(primary.rsvp);
    });
    return () => {
      cancelled = true;
    };
  }, [adoptRecordedParty, seedAutosaveBaseline]);

  // Whatever answer was recorded before is withdrawn outright, family rows and
  // all, so two answers can never sit on the guest list at once. The drafts on
  // screen survive it: they are what the next answer will be made of.
  const retireAnyRecordedAnswer = async (): Promise<void> => {
    if (!recordedGuestId) return;
    await retireGuestFromConstellation(recordedGuestId);
    partyDraft.releaseFamilyPersistence();
    rememberRecordedGuestId(null);
    seedAutosaveBaseline(null, []);
    // The row that held it is gone; the words stay on screen, unsaved.
    setSavedNote('');
    setRecordedGuestId(null);
    setRecordedRsvp(null);
  };

  const recordAnswer = async (isAttending: boolean): Promise<void> => {
    if (partyDraft.isSubmitting) return;
    hasGuestAnsweredThisVisitRef.current = true;
    setHasRecordingFailed(false);
    partyDraft.setIsSubmitting(true);
    try {
      await retireAnyRecordedAnswer();
      const persistedRows = await persistGuestThroughConstellationCatalog(
        partyDraft.assemblePartyPayload(guestName, isAttending),
      );
      const [primaryRow, ...familyRows] = persistedRows;
      if (!primaryRow) throw new Error('The catalog acknowledged nothing');
      // The server drops nameless family drafts exactly as the payload builder
      // did, so the rows come back in the order of the drafts that survived.
      const survivingDrafts = partyDraft.familyDrafts.filter((draft) => draft.name.trim() !== '');
      survivingDrafts.forEach((draft, memberIndex) => {
        const familyRow = familyRows[memberIndex];
        if (familyRow) patchFamilyDraft(draft.draftKey, { persistedId: familyRow.id });
      });
      seedAutosaveBaseline({ isAttending, diet: primaryRow.diet }, familyRows);
      setSavedNote(primaryRow.note ?? '');
      rememberRecordedGuestId(primaryRow.id);
      setRecordedGuestId(primaryRow.id);
      setRecordedRsvp(isAttending);
    } catch {
      // The drafts stay as they were; the button says so and takes a retry.
      setHasRecordingFailed(true);
    } finally {
      partyDraft.setIsSubmitting(false);
    }
  };

  // Clicking the answer you already gave takes it back: no button selected, no
  // row in the catalog, and the box closes to the bare pair again.
  const withdrawRecordedAnswer = (): void => {
    setRsvpIntent(null);
    setHasRecordingFailed(false);
    if (!recordedGuestId || partyDraft.isSubmitting) return;
    hasGuestAnsweredThisVisitRef.current = true;
    partyDraft.setIsSubmitting(true);
    void retireAnyRecordedAnswer()
      .catch(() => {})
      .finally(() => partyDraft.setIsSubmitting(false));
  };

  const chooseRsvpIntent = (isAttending: boolean): void => {
    // An answer already going over the wire owns the panel until it lands.
    // Without this, a second click during that window reads recordedGuestId as
    // still-null, mistakes an answer in flight for one that failed, and records
    // it twice over.
    if (partyDraft.isSubmitting) return;
    if (rsvpIntent === isAttending) {
      // Clicking the selected button again either retries an answer that never
      // landed, or unsays one that did.
      if (recordedGuestId === null && hasRecordingFailed) void recordAnswer(isAttending);
      else withdrawRecordedAnswer();
      return;
    }
    setRsvpIntent(isAttending);
    if (recordedRsvp === isAttending) return;
    void recordAnswer(isAttending);
  };

  // The note travels on its own button, so the panel has to remember what we
  // hold in order to know whether there is anything left to send.
  const isNoteUnsaved = partyDraft.noteDraft.trim() !== savedNote.trim();
  const saveNote = (): void => {
    if (!recordedGuestId || !isNoteUnsaved || isSavingNote) return;
    const noteBeingSaved = partyDraft.noteDraft.trim();
    setIsSavingNote(true);
    setHasNoteSaveFailed(false);
    void reviseOwnGuestRow(recordedGuestId, { note: noteBeingSaved })
      .then(() => setSavedNote(noteBeingSaved))
      .catch(() => setHasNoteSaveFailed(true))
      .finally(() => setIsSavingNote(false));
  };

  const discardFamilyMember = (draftKey: string, persistedId: string | null): void => {
    partyDraft.discardFamilyDraft(draftKey);
    if (persistedId) void retireGuestFromConstellation(persistedId).catch(() => {});
  };

  // The note is the one thing here that isn't a setting, so it waits for its
  // author rather than saving itself mid-sentence. The button sits in the
  // corner of the field it belongs to and goes quiet once what's typed is what
  // we already hold.
  const noteField = (
    <div className="w-full">
      <label className={`${className} sr-only`} htmlFor="handfasting-guest-note">
        A note for Ray and Elizabeth
      </label>
      <div className="relative w-full">
        <textarea
          ref={noteInputRef}
          id="handfasting-guest-note"
          name="guestNote"
          rows={1}
          maxLength={MAX_GUEST_NOTE_LENGTH}
          value={partyDraft.noteDraft}
          onChange={(inputEvent) => {
            hasGuestEditedDraftsRef.current = true;
            partyDraft.setNoteDraft(inputEvent.target.value);
            fitNoteHeightToContent(inputEvent.target);
          }}
          placeholder="A note for us, if you like (optional)..."
          className={`${cormorant.className} w-full resize-none overflow-hidden rounded-sm border-none bg-transparent py-1 pr-14 text-left font-light italic tracking-[0.02em] text-white/90 outline-none placeholder:text-white/40`}
        />
        <button
          type="button"
          onClick={saveNote}
          disabled={!isNoteUnsaved || isSavingNote || recordedGuestId === null}
          className={`${cormorant.className} absolute right-0 top-1 cursor-pointer rounded-sm border-none bg-transparent px-2 py-0.5 text-[0.85rem] font-light italic tracking-[0.04em] transition-colors duration-200 motion-reduce:transition-none disabled:cursor-default ${
            isNoteUnsaved && !isSavingNote && recordedGuestId !== null
              ? 'text-[#cbc4b3] hover:text-white'
              : 'text-white/30'
          }`}
        >
          {isSavingNote ? 'Saving…' : hasNoteSaveFailed ? 'Try again' : 'Save'}
        </button>
      </div>
    </div>
  );

  const autosaveNotice =
    autosaveStatus === 'saving'
      ? 'Saving…'
      : autosaveStatus === 'saved'
        ? 'Saved'
        : autosaveStatus === 'failed'
          ? 'That last change did not save — change it again and it will retry.'
          : '';
  const [isAutosaveNoticeFaded, setIsAutosaveNoticeFaded] = useState(false);
  const [isAutosaveNoticeDismissed, setIsAutosaveNoticeDismissed] = useState(false);
  useEffect(() => {
    if (autosaveNotice === '') {
      setIsAutosaveNoticeFaded(false);
      setIsAutosaveNoticeDismissed(false);
      return;
    }
    setIsAutosaveNoticeDismissed(false);
    if (autosaveStatus === 'saving') {
      setIsAutosaveNoticeFaded(false);
      return;
    }
    setIsAutosaveNoticeFaded(false);
    const fadeFrame = requestAnimationFrame(() => setIsAutosaveNoticeFaded(true));
    const dismissTimer = setTimeout(() => setIsAutosaveNoticeDismissed(true), 30_000);
    return () => {
      cancelAnimationFrame(fadeFrame);
      clearTimeout(dismissTimer);
    };
  }, [autosaveNotice, autosaveStatus]);

  return (
    <div className="flex w-full max-w-lg flex-col items-center">
      {/* The pair never leaves: whichever answer is recorded, the other one is
          still one click away. */}
      <div className="flex w-full flex-wrap justify-center gap-4">
        <button
          type="button"
          className={`${rsvpChoiceButtonClassName} ${
            isAcceptingIntent ? 'border-[#fffff8] bg-white/15' : 'border-white/40'
          }`}
          aria-pressed={isAcceptingIntent}
          onClick={() => chooseRsvpIntent(true)}
        >
          RSVP Accept
        </button>
        <button
          type="button"
          className={`${rsvpChoiceButtonClassName} ${
            rsvpIntent === false ? 'border-[#fffff8] bg-white/15' : 'border-white/40'
          }`}
          aria-pressed={rsvpIntent === false}
          onClick={() => chooseRsvpIntent(false)}
        >
          RSVP Decline
        </button>
      </div>
      {/* Everything the chosen answer needs lives below the buttons, so
          switching answers swaps what is below and never the pair itself. Your
          own card comes first, then one card per person you bring, all cut the
          same way; the button that makes another one sits under the lot.

          The 0fr/1fr grid row is what makes the height animatable without
          anyone having to know how tall the contents are. */}
      <div
        aria-hidden={!isRsvpExpanded}
        inert={!isRsvpExpanded}
        className={`grid w-full transition-all duration-500 ease-out motion-reduce:transition-none ${
          isRsvpExpanded ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'
        }`}
      >
        {/* The gap above the cards lives inside the collapsing element, so a
            closed box takes up no room at all rather than a stray gap's worth. */}
        <div className="overflow-hidden">
          <div className="flex w-full flex-col items-center gap-4 pt-4">
            {hasRecordingFailed ? (
              // The one thing worth interrupting for: the answer never landed,
              // so nothing below it would be editing anything.
              <div className={PANEL_CARD_CLASS_NAME}>
                <p aria-live="polite" className={quietNoteClassName}>
                  Hmm, that didn't work for some reason. If it doesn't work on the next try, send us a message about our site being broke.
                </p>
              </div>
            ) : (
              // Otherwise the cards go up on the click itself. The row lands a
              // moment later, and nothing on screen has to wait for it.
              <>
                {/* A decline has nothing to decide, only something to say, so
                    the note stands on its own rather than rattling around
                    inside a card with nothing else in it. */}
                {isShowingAttending ? (
                  <div className={PANEL_CARD_CLASS_NAME}>
                    <DietChoiceTrio
                      diet={partyDraft.primaryDiet}
                      menuOptions={menuOptions}
                      onDietChange={partyDraft.setPrimaryDiet}
                    />
                    {noteField}
                  </div>
                ) : (
                  <div className={PANEL_CARD_CLASS_NAME}>
                    {noteField}
                  </div>
                )}
                {/* One card per person you bring, cut the same way as your own,
                  and the button that makes another one under all of them. */}
                {isShowingAttending && (
                  <>
                    {partyDraft.familyDrafts.map((familyDraft) => (
                      <FamilyMemberRow
                        key={familyDraft.draftKey}
                        draft={familyDraft}
                        menuOptions={menuOptions}
                        onPatch={(patch) => patchFamilyDraft(familyDraft.draftKey, patch)}
                        onDiscard={() => discardFamilyMember(familyDraft.draftKey, familyDraft.persistedId)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={partyDraft.appendFamilyDraft}
                      disabled={partyDraft.familyDrafts.length >= MAX_FAMILY_MEMBERS}
                      className={`${cormorant.className} cursor-pointer rounded-full border border-white/25 bg-transparent px-4 py-1 font-light italic tracking-[0.04em] text-[#cbc4b3] disabled:cursor-default disabled:opacity-40`}
                    >
                      Add a family member or +1
                    </button>
                  </>
                )}
                {autosaveNotice !== '' && !isAutosaveNoticeDismissed && (
                  <p
                    aria-live="polite"
                    className={`${quietNoteClassName} ${
                      autosaveStatus === 'saving'
                        ? 'opacity-100'
                        : `transition-opacity duration-[30000ms] ease-linear motion-reduce:transition-none ${isAutosaveNoticeFaded ? 'opacity-0' : 'opacity-100'}`
                    }`}
                  >
                    {autosaveNotice}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Under the whole panel, and so above the tree on the page. */}
      {isThanking && <RsvpGratitude />}
    </div>
  );
};

export default GuestNameEntry;
