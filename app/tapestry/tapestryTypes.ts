// The tapestry renders every confirmed guest as one strand in a shared
// composition. Sides come from the invite list ('elizabeth' | 'ray' | 'both');
// guests who registered without a tokenized link get a deterministic side so
// the composition stays balanced across renders.
export type TapestrySide = 'elizabeth' | 'ray' | 'both';

export type TapestryPerson = {
  id: string;
  name: string;
  side: TapestrySide;
  // Family parties share a familyKey (the primary registrant's id) so their
  // strands sit adjacent — one household reads as one cluster.
  familyKey: string;
  // Host-written note surfaced as a tooltip when the cursor rests on this
  // person's name in the tapestry.
  hovertext?: string | null;
};

export type TapestryVariant = 'tree' | 'knot' | 'wreath';

// 'staggered' cascades every strand on mount (a full page load); 'single'
// gives each strand the same short delay, so an arrival added to an
// already-drawn tapestry animates in alone.
export type TapestryEntrance = 'staggered' | 'single';
