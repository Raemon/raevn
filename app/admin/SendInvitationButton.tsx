'use client';

import { useState } from 'react';
import { adminButtonClassName } from './adminTableStyles';

// Two-step arm-then-send so a stray click can never email anyone.

const SendInvitationButton = ({
  label,
  disabled,
  title,
  onSend,
}: {
  label: string;
  disabled?: boolean;
  title?: string;
  onSend: () => Promise<void>;
}) => {
  const [isArmed, setIsArmed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const handleClick = async () => {
    if (!isArmed) {
      setIsArmed(true);
      return;
    }
    setIsSending(true);
    try {
      await onSend();
    } finally {
      setIsSending(false);
      setIsArmed(false);
    }
  };
  return (
    <button
      type="button"
      className={`${adminButtonClassName} ${isArmed ? 'border-[#a33a3a] text-[#a33a3a] hover:bg-[#a33a3a]/10' : ''}`}
      disabled={disabled || isSending}
      title={title}
      onClick={handleClick}
      onBlur={() => setIsArmed(false)}
    >
      {isSending ? 'Sending…' : isArmed ? 'Really send?' : label}
    </button>
  );
};

export default SendInvitationButton;
