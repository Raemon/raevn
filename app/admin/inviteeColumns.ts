// Column identity for the invitee table, shared by the client table (which
// renders and reorders them) and the API route that persists an order to
// app/admin/inviteeColumnOrder.json. Ids are stable; labels are cosmetic.

export const INVITEE_COLUMN_IDS = [
  'sortOrder',
  'side',
  'sideBlend',
  'name',
  'partyLink',
  'email',
  'note',
  'diagramHovertext',
  'link',
  'invitationLetter',
  'sentAt',
  'send',
] as const;

export type InviteeColumnId = (typeof INVITEE_COLUMN_IDS)[number];

export const INVITEE_COLUMN_LABELS: Record<InviteeColumnId, string> = {
  sortOrder: '#',
  side: 'side',
  sideBlend: 'side blend',
  name: 'name',
  partyLink: 'party link',
  email: 'email',
  note: 'note',
  diagramHovertext: 'diagram hovertext',
  link: 'link',
  invitationLetter: 'invitation letter',
  sentAt: 'sent at',
  send: 'send',
};

export const isInviteeColumnId = (value: unknown): value is InviteeColumnId =>
  typeof value === 'string' && (INVITEE_COLUMN_IDS as readonly string[]).includes(value);

// Columns the table still knows how to render but no longer shows. Kept here
// rather than deleted so re-enabling one is a single-line change, and so a
// saved column order that still names them stays valid.
export const INVITEE_HIDDEN_COLUMN_IDS: readonly InviteeColumnId[] = ['side', 'note'];

// A saved order wins where it is valid; anything it doesn't mention (a column
// added after the file was last written) keeps its default position at the end,
// so a stale file degrades instead of hiding a column.
export const orderInviteeColumns = (saved: readonly string[] | null): InviteeColumnId[] => {
  const ordered = (saved ?? []).filter(isInviteeColumnId).filter(
    (id, index, all) => all.indexOf(id) === index,
  );
  return [...ordered, ...INVITEE_COLUMN_IDS.filter((id) => !ordered.includes(id))].filter(
    (id) => !INVITEE_HIDDEN_COLUMN_IDS.includes(id),
  );
};
