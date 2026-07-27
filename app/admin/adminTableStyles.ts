// One place for the plain-table look shared by the invitee and guest tables.
// Light mode, sans-serif, sized for comfortable reading rather than density.

export const adminTableClassName = 'w-full border-collapse text-left text-base';
export const adminThClassName =
  'border border-[#cfc7b6] bg-[#efeae0] px-3 py-2 text-sm font-semibold uppercase tracking-wider text-[#7a5a1c] whitespace-nowrap';
export const adminTdClassName = 'border border-[#ddd6c8] px-3 py-2 align-top text-[#1f1c18]';
export const adminMutedClassName = 'text-[#6f6a61]';
// Names are the widest free-text column; cap them so one long name can't push
// the rest of the table sideways. Applied to the block-level cell content
// (a td's own max-width is only a hint to table layout).
export const adminNameCellClassName = 'max-w-44 break-words';
// Emails are long, rarely read closely, and never need to be the widest column:
// small mono on one line keeps the column to exactly the address's width, so the
// full-width table hands the slack to the note column instead.
export const adminEmailCellClassName = 'whitespace-nowrap font-mono text-xs';
export const adminButtonClassName =
  'cursor-pointer rounded-sm border border-[#b99a5e] bg-white px-3 py-1 text-sm font-medium uppercase tracking-wider text-[#7a5a1c] transition-colors hover:bg-[#f3e9d5] disabled:cursor-default disabled:opacity-40 whitespace-nowrap';
