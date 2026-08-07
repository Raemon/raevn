'use client';

import { useState } from 'react';

// The reply never says whether an email actually went out — a stranger who
// found this page learns the same thing either way.

const RequestLinkButton = () => {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const requestLink = async () => {
    setState('sending');
    const response = await fetch('/api/pocket/request-link', { method: 'POST' }).catch(() => null);
    setState(response?.ok ? 'sent' : 'error');
  };
  if (state === 'sent') {
    return (
      <p className="m-0 text-[0.95rem] italic text-[#c9a85c]">
        Sent, if this is your door. Check the hosts&rsquo; email.
      </p>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={requestLink}
        disabled={state === 'sending'}
        className="rounded-full border border-[#c9a85c] bg-transparent px-6 py-2 text-xs uppercase tracking-[0.2em] text-[#e9d9ae] disabled:opacity-50"
      >
        {state === 'sending' ? 'sending…' : 'email me the link'}
      </button>
      {state === 'error' && <p className="m-0 text-sm text-[#c96a5a]">That didn&rsquo;t send — try again.</p>}
    </>
  );
};

export default RequestLinkButton;
