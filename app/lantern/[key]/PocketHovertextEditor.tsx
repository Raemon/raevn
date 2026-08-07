'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { hovertextIssues, sharedSignoffWarnings } from '@/lib/hovertextIssues';
import { POCKET_KEY_HEADER } from '@/lib/pocketKeyHeader';
import { cormorant, playfair } from '../../handfasting-simple/save-the-date/handfastingInvitationTypography';

// One column of the ledger, sized for a thumb: pick a name, write the note that
// appears when someone hovers it in the tapestry, and it saves itself. The
// desktop table's red/amber flags come along, because the point of writing
// these on a phone is writing them in the gaps of a day, and a signature is
// exactly the thing you forget in a gap.

export type PocketInvitee = {
  id: string;
  name: string;
  side: string;
  sideBlend: number;
  diagramHovertext: string | null;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type Filter = 'all' | 'unwritten' | 'flagged';

const AUTOSAVE_DELAY_MS = 900;

// 0 is Ray's end of the spectrum, 1 Elizabeth's; the middle belongs to both.
const blendLabel = (sideBlend: number): string =>
  sideBlend < 0.4 ? 'Ray' : sideBlend > 0.6 ? 'Elizabeth' : 'both';

const fitHeightToContent = (element: HTMLTextAreaElement | null) => {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
};

const PocketHovertextEditor = ({
  pocketKey,
  initialInvitees,
}: {
  pocketKey: string;
  initialInvitees: PocketInvitee[];
}) => {
  const [invitees, setInvitees] = useState(initialInvitees);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openInvitee = invitees.find((invitee) => invitee.id === openId) ?? null;

  const save = async (id: string, text: string): Promise<boolean> => {
    setSaveState('saving');
    const response = await fetch('/api/pocket/hovertext', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', [POCKET_KEY_HEADER]: pocketKey },
      body: JSON.stringify({ id, diagramHovertext: text }),
    }).catch(() => null);
    if (!response?.ok) {
      setSaveState('error');
      return false;
    }
    const saved = (await response.json().catch(() => null)) as { invitee?: PocketInvitee } | null;
    const stored = saved?.invitee?.diagramHovertext ?? null;
    setInvitees((current) =>
      current.map((invitee) =>
        invitee.id === id ? { ...invitee, diagramHovertext: stored } : invitee,
      ),
    );
    setSaveState('saved');
    return true;
  };

  // Autosave rather than a Save button: a phone loses the page to a phone call
  // or a swipe, and an unsent draft is the one failure mode that would make
  // this worse than not writing it at all.
  useEffect(() => {
    if (!openInvitee) return;
    if (draft === (openInvitee.diagramHovertext ?? '')) return;
    const timer = setTimeout(() => void save(openInvitee.id, draft), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, openInvitee?.id, openInvitee?.diagramHovertext]);

  const openEditor = (invitee: PocketInvitee) => {
    setOpenId(invitee.id);
    setDraft(invitee.diagramHovertext ?? '');
    setSaveState('idle');
  };

  const closeEditor = async () => {
    if (openInvitee && draft !== (openInvitee.diagramHovertext ?? '')) {
      const ok = await save(openInvitee.id, draft);
      if (!ok) return; // Keep the box open rather than swallowing the text.
    }
    setOpenId(null);
  };

  const appendSignature = (signature: string) => {
    setDraft((current) => `${current.replace(/\s+$/, '')}${current.trim() === '' ? '' : '\n'}– ${signature}`);
    textareaRef.current?.focus();
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return invitees.filter((invitee) => {
      if (needle !== '' && !invitee.name.toLowerCase().includes(needle)) return false;
      if (filter === 'unwritten') return (invitee.diagramHovertext ?? '').trim() === '';
      if (filter === 'flagged') {
        return hovertextIssues(invitee).length > 0 || sharedSignoffWarnings(invitee).length > 0;
      }
      return true;
    });
  }, [invitees, query, filter]);

  const written = invitees.filter((invitee) => (invitee.diagramHovertext ?? '').trim() !== '').length;

  return (
    <main className={`${cormorant.className} min-h-svh bg-[#0c0b09] pb-16 text-[#e9e3d4]`}>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0c0b09]/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <h1 className={`${playfair.className} m-0 text-xl font-normal tracking-[0.06em]`}>Hover notes</h1>
          <span className="text-xs tracking-wide text-[#7d766a]">
            {written}/{invitees.length} written
          </span>
        </div>
        <input
          type="search"
          value={query}
          onChange={(changeEvent) => setQuery(changeEvent.target.value)}
          placeholder="Find a name"
          className="mt-3 w-full rounded-md border border-white/20 bg-black/50 px-3 py-2 text-base outline-none placeholder:text-[#6f685c] focus:border-white/45"
        />
        <div className="mt-2 flex gap-2 text-xs uppercase tracking-[0.18em]">
          {(['all', 'unwritten', 'flagged'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-full border px-3 py-1 transition-colors ${
                filter === option
                  ? 'border-[#c9a85c] bg-[#c9a85c]/15 text-[#e9d9ae]'
                  : 'border-white/15 bg-transparent text-[#7d766a]'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </header>

      <ul className="m-0 list-none p-0">
        {visible.map((invitee) => {
          const issues = hovertextIssues(invitee);
          const warnings = issues.length > 0 ? [] : sharedSignoffWarnings(invitee);
          const text = (invitee.diagramHovertext ?? '').trim();
          const isOpen = invitee.id === openId;
          return (
            <li key={invitee.id} className="border-b border-white/8">
              <button
                type="button"
                onClick={() => (isOpen ? void closeEditor() : openEditor(invitee))}
                className="flex w-full items-start gap-3 bg-transparent px-4 py-3 text-left"
              >
                <span className="min-w-0 grow">
                  <span className={`${playfair.className} block text-[1.05rem] leading-snug`}>{invitee.name}</span>
                  {/* The open row's own textarea is the preview; showing both
                      would print the note twice. */}
                  {!isOpen && (
                    <span
                      className={`mt-0.5 block text-sm leading-snug ${text === '' ? 'italic text-[#6f685c]' : 'text-[#a49c8c]'}`}
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {text === '' ? 'no note yet' : text}
                    </span>
                  )}
                </span>
                <span className="shrink-0 pt-1 text-[0.65rem] uppercase tracking-[0.16em] text-[#6f685c]">
                  {blendLabel(invitee.sideBlend)}
                </span>
              </button>

              {(issues.length > 0 || warnings.length > 0) && (
                <p className={`m-0 px-4 pb-2 text-xs leading-snug ${issues.length > 0 ? 'text-[#c96a5a]' : 'text-[#c9a85c]'}`}>
                  {[...issues, ...warnings].join(' · ')}
                </p>
              )}

              {isOpen && (
                <div className="px-4 pb-4">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    autoFocus
                    onChange={(changeEvent) => {
                      setDraft(changeEvent.target.value);
                      setSaveState('idle');
                      fitHeightToContent(changeEvent.target);
                    }}
                    onFocus={(focusEvent) => fitHeightToContent(focusEvent.target)}
                    rows={4}
                    placeholder="What they should read when they find their name…"
                    className="w-full resize-none rounded-md border border-white/25 bg-black/60 px-3 py-2 text-base italic leading-[1.5] outline-none placeholder:text-[#6f685c] focus:border-white/45"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em]">
                    <button
                      type="button"
                      onClick={() => appendSignature('Ray')}
                      className="rounded-full border border-white/15 bg-transparent px-3 py-1 text-[#a49c8c]"
                    >
                      – Ray
                    </button>
                    <button
                      type="button"
                      onClick={() => appendSignature('Elizabeth')}
                      className="rounded-full border border-white/15 bg-transparent px-3 py-1 text-[#a49c8c]"
                    >
                      – Elizabeth
                    </button>
                    <span className="grow" />
                    <span className={`normal-case tracking-wide ${saveState === 'error' ? 'text-[#c96a5a]' : 'text-[#6f685c]'}`}>
                      {saveState === 'saving'
                        ? 'saving…'
                        : saveState === 'saved'
                          ? 'saved'
                          : saveState === 'error'
                            ? 'save failed — still here, try again'
                            : 'saves as you write'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void closeEditor()}
                      className="bg-transparent px-1 font-medium text-[#c9a85c]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-4 py-10 text-center text-sm italic text-[#6f685c]">Nobody matches that.</li>
        )}
      </ul>
    </main>
  );
};

export default PocketHovertextEditor;
