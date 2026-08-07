'use client';

import { useState } from 'react';
import { DEFAULT_TAGLINE_HOVERTEXT } from '@/lib/taglineHovertextDefault';
import { cormorant } from '../handfasting-simple/save-the-date/handfastingInvitationTypography';

// Edits the note that appears when a guest hovers the dashed phrase in the
// invite page's subtitle. The preview below the box is the invite page's own
// hero type and tooltip styling, so what reads well here reads well there.

const TaglineHovertextEditor = ({ initialHovertext }: { initialHovertext: string }) => {
  const [hovertext, setHovertext] = useState(initialHovertext);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const saveHovertext = async () => {
    setSaveState('saving');
    const response = await fetch('/api/admin/tagline-hovertext', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hovertext }),
    }).catch(() => null);
    if (!response?.ok) {
      setSaveState('error');
      return;
    }
    // An empty box clears the row, and the page then shows the built-in
    // default — so show that here too rather than leaving a blank box.
    const saved = (await response.json().catch(() => null)) as { hovertext?: string | null } | null;
    setHovertext(saved?.hovertext ?? DEFAULT_TAGLINE_HOVERTEXT);
    setSaveState('saved');
  };

  return (
    <div className="overflow-hidden rounded-md bg-[#0c0b09] bg-gradient-to-b from-[#181410] to-[#0c0b09]">
      <div className="px-6 py-8 sm:px-12">
        <p className={`${cormorant.className} m-0 text-center text-[1.45rem] font-light italic tracking-[0.04em] text-[#cbc4b3]`}>
          Round 2 of an{' '}
          <span className="underline decoration-dashed decoration-[#8f887a] decoration-from-font underline-offset-[0.28em]">
            iterated superlinear kickstarter of love
          </span>
          .
        </p>
        <textarea
          value={hovertext}
          onChange={(changeEvent) => {
            setHovertext(changeEvent.target.value);
            setSaveState('idle');
          }}
          rows={4}
          placeholder={DEFAULT_TAGLINE_HOVERTEXT}
          className={`${cormorant.className} mx-auto mt-6 block w-full max-w-xl resize-y rounded-md border border-white/25 bg-black/60 px-3 py-2 text-center text-[0.95rem] font-light italic leading-[1.45] tracking-[0.03em] text-[#e9e3d4] caret-[#e9e3d4] outline-none placeholder:text-[#6f685c] focus:border-white/45`}
        />
      </div>
      <div className="flex items-center gap-4 border-t border-white/10 px-6 py-2.5 sm:px-12">
        <span className="text-xs tracking-wide text-[#6f685c]">
          Leave empty to restore the default wording.
        </span>
        <span className="grow" />
        <span className={`text-xs tracking-wide ${saveState === 'error' ? 'text-[#c96a5a]' : 'text-[#6f685c]'}`}>
          {saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved' : saveState === 'error' ? 'save failed — try again' : ''}
        </span>
        <button
          type="button"
          onClick={saveHovertext}
          disabled={saveState === 'saving'}
          className="bg-transparent text-xs font-medium uppercase tracking-[0.2em] text-[#c9a85c] transition-colors hover:text-[#e9d9ae] disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default TaglineHovertextEditor;
