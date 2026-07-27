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

// 'tree2' is a second pass at the tree — horizontal names on a knot-style
// braided trunk. 'tree3' is the original tree with nothing changed but its
// labels, which lie flat instead of radiating. Both are kept alongside the
// original so they can be compared at /preview.
export type TapestryVariant = 'tree' | 'tree2' | 'tree3' | 'knot' | 'wreath';

// 'staggered' cascades every strand on mount (a full page load); 'single'
// gives each strand the same short delay, so an arrival added to an
// already-drawn tapestry animates in alone.
export type TapestryEntrance = 'staggered' | 'single';
