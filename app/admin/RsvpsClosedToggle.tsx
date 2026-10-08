'use client';

import { useState } from 'react';

// The one switch that ends RSVPs: flipping it replaces the invite page's RSVP
// panel with "RSVPs are closed now." and stops guests' edits from saving.

const RsvpsClosedToggle = ({ initialClosed }: { initialClosed: boolean }) => {
  const [closed, setClosed] = useState(initialClosed);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error'>('idle');

  const toggle = async () => {
    const next = !closed;
    setSaveState('saving');
    const response = await fetch('/api/admin/rsvps-closed', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closed: next }),
    }).catch(() => null);
    if (!response?.ok) {
      setSaveState('error');
      return;
    }
    setClosed(next);
    setSaveState('idle');
  };

  return (
    <div className="mx-auto mb-10 flex max-w-xl items-center justify-center gap-4 rounded-md border border-[#ddd6c8] bg-white px-5 py-3">
      <span className="text-base">
        RSVPs are{' '}
        <strong className={closed ? 'text-[#a2412f]' : 'text-[#3d6b35]'}>{closed ? 'closed' : 'open'}</strong>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={closed}
        aria-label="RSVPs closed"
        onClick={toggle}
        disabled={saveState === 'saving'}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${closed ? 'bg-[#a2412f]' : 'bg-[#3d6b35]'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${closed ? 'left-[1.375rem]' : 'left-0.5'}`}
        />
      </button>
      <span className={`w-28 text-sm ${saveState === 'error' ? 'text-[#a2412f]' : 'text-[#6f6a61]'}`}>
        {saveState === 'saving' ? 'saving…' : saveState === 'error' ? 'save failed' : ''}
      </span>
    </div>
  );
};

export default RsvpsClosedToggle;
