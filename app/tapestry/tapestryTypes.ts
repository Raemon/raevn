// The tapestry renders every confirmed guest as one strand in a shared
// composition. Sides come from the invite list ('elizabeth' | 'ray' | 'both');
// guests who registered without a tokenized link get a deterministic side so
// the composition stays balanced across renders.
export type TapestrySide = 'elizabeth' | 'ray' | 'both';

export type TapestryPerson = {
  id: string;
  name: string;
  side: TapestrySide;
  // 0 = Ray (maroon), 1 = Elizabeth (blue). Finer placement than `side`.
  sideBlend: number;
  // Family parties share a familyKey (the primary registrant's id) so their
  // strands sit adjacent — one household reads as one cluster.
  familyKey: string;
  // Host-written note surfaced as a tooltip when the cursor rests on this
  // person's name in the tapestry.
  hovertext?: string | null;
};

// 'staggered' cascades every strand on mount (a full page load); 'single'
// gives each strand the same short delay, so an arrival added to an
// already-drawn tapestry animates in alone.
export type TapestryEntrance = 'staggered' | 'single';

// Side and hover copy for the invitee behind a tokenized link — carried on
// optimistic rows so the tapestry can place and caption them before Neon answers.
export type InviteeTapestryHint = {
  side: string;
  sideBlend?: number | null;
  diagramHovertext?: string | null;
};
