'use client';

import { useState } from 'react';
import { adminButtonClassName } from './adminTableStyles';

const CopyInviteLinkButton = ({ inviteUrl }: { inviteUrl: string }) => {
  const [justCopied, setJustCopied] = useState(false);
  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1500);
  };
  return (
    <button type="button" onClick={copyLink} className={adminButtonClassName}>
      {justCopied ? 'Copied' : 'Copy link'}
    </button>
  );
};

export default CopyInviteLinkButton;
