'use client';

import { adminMutedClassName, adminNameCellClassName } from './adminTableStyles';

export type GuestPartyLinkOption = {
  id: string;
  label: string;
};

const GuestPartyLinkSelect = ({
  registeredById,
  primaryOptions,
  familyCount,
  disabled,
  onCommit,
}: {
  registeredById: string | null;
  primaryOptions: GuestPartyLinkOption[];
  familyCount: number;
  disabled: boolean;
  onCommit: (registeredById: string | null) => Promise<boolean>;
}) => {
  if (disabled) {
    return (
      <span className={`block ${adminNameCellClassName} ${adminMutedClassName}`}>
        {familyCount > 0 ? `primary (+${familyCount})` : '—'}
      </span>
    );
  }
  return (
    <select
      value={registeredById ?? ''}
      disabled={disabled}
      onChange={(changeEvent) => {
        const nextRegisteredById = changeEvent.target.value === '' ? null : changeEvent.target.value;
        void onCommit(nextRegisteredById);
      }}
      className={`w-full max-w-44 cursor-pointer bg-transparent py-0.5 text-[#1f1c18] outline-none focus:text-[#7a5a1c] ${adminNameCellClassName}`}
    >
      <option value="">—</option>
      {primaryOptions.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default GuestPartyLinkSelect;
