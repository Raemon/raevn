'use client';

import type { ReactNode } from 'react';
import { cormorant } from '../save-the-date/handfastingInvitationTypography';

const CelestialCheckbox = ({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) => (
  <label className={`${cormorant.className} flex cursor-pointer items-center gap-2 text-[clamp(0.95rem,1.6vw,1.15rem)] font-light italic tracking-[0.04em] text-[#cbc4b3]`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(changeEvent) => onChange(changeEvent.target.checked)}
      className="h-4 w-4 cursor-pointer accent-[#cbc4b3]"
    />
    <span>{children}</span>
  </label>
);

export default CelestialCheckbox;
