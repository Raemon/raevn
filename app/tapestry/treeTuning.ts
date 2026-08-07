// Every knob that shapes the guest tree, in one place. This file is pure data:
// no logic, no imports, nothing that can break by being edited. Change a number
// here and the drawing changes — see TreeV4Tapestry.tsx for how each one is
// used, and strandTree.ts for the strand model underneath.

// Anything the tree grows into as replies arrive is written as a pair: what it
// is when nobody has answered, and what it settles at once the guest list is
// long. Everything in between is interpolated along one saturating curve
// (GROWTH.saturation), so the whole tree grows together rather than in parts.
export type GrowthRange = { seedling: number; mature: number };

// ---------------------------------------------------------------------------
// The frame the tree stands in
// ---------------------------------------------------------------------------
export const FRAME = {
  // Where the trunk stands and where the ground line sits, in viewBox units.
  canopyX: 700,
  rootY: 1015,
  // Wide, and only as deep as the tree standing in it: the top edge is cut from
  // the crown's own extent at render time, so a seedling gets a seedling's
  // frame rather than a page of empty sky above it.
  width: 1400,
  // Room below the ground line for the roots to reach into and the couple's
  // names to sit under them without the two tangling.
  bottomMargin: 132,
  // Blank space kept above the topmost name, in multiples of its own type size.
  topMarginLines: 1.5,
  // A dome rather than a full circle: the crown reaches almost to horizontal on
  // each side, so no limb has to travel downwards to be reached.
  sectorStartDeg: -176,
  sectorEndDeg: -4,
  // Crowns are wider than they are tall, but only slightly: the flatter the
  // crown, the more names share a height, and names sharing a height is the
  // whole difficulty. Nearly all the vertical room the trunk gives up is spent
  // here.
  crownSquash: 0.95,
  // The guarantee for very wide screens, where a mature crown would otherwise
  // grow taller than the viewport. When it bites, the drawing scales down and
  // centres rather than being cropped.
  maxHeightVh: 90,
  // Phones get the frame's empty side margins cropped away instead of shrunk
  // onto the screen: a young tree fills only the middle of this wide frame, and
  // scaling all of it into a phone's width left every name unreadably small.
  // Below this CSS width the drawing is blown up so the widest thing actually
  // in it spans the screen, and the blank sides overflow out of frame.
  phoneMaxWidthPx: 767,
  // Breathing room kept beyond the widest name on those screens, in viewBox
  // units per side.
  phoneSideMargin: 30,
  // A floor on the visible half-width, so the couple's signature and tagline
  // under the roots — wider than a seedling's whole crown — never leave frame.
  phoneMinHalfWidth: 210,
};

// ---------------------------------------------------------------------------
// How the tree grows as replies come in
// ---------------------------------------------------------------------------
export const GROWTH = {
  // How fast the seedling becomes a tree, in guests. Saturating, so the first
  // few replies visibly grow it and a long list still lands near the mature
  // proportions.
  saturation: 16,
  // The trunk is deliberately short — a stem for the crown to sit on, not the
  // subject. Height is the scarce dimension here, and every unit spent on trunk
  // is one the canopy cannot use to hold names apart.
  trunkHeight: { seedling: 54, mature: 96 } as GrowthRange,
  // Radius of the innermost ring of names.
  ringBase: { seedling: 46, mature: 248 } as GrowthRange,
  // Gap between rings. Spaced generously: two names on neighbouring rings
  // should never land close enough in height to need nudging apart afterwards.
  ringStep: { seedling: 24, mature: 84 } as GrowthRange,
  // Guest counts at which the crown gains another ring. More rings spread names
  // over more radii, which is what keeps their flat labels from landing at the
  // same height as one another.
  ringCountBreaks: [14, 32, 48],
  // With only one ring there is no ring spacing to push names apart, so the
  // single ring is pushed out instead.
  singleRingBonus: 40,
  // Random in-and-out wobble on each name's radius, so a ring does not read as
  // a drawn circle. Scaled by growth, so a seedling's few names stay tidy.
  ringJitter: 22,
};

// ---------------------------------------------------------------------------
// The guest threads
// ---------------------------------------------------------------------------
export const THREADS = {
  width: 1.5,
  // Centre-to-centre spacing inside a bundle: a bundle of n threads is about
  // spacing·√n across, so the trunk thickens as the guest list grows without
  // any width rule being written down.
  spacing: 3.6,
  // Full twists from ground to leaf tip.
  twistTurns: 3.2,
  // Slackens each thread towards a straight run between its waypoints: 1 hugs
  // every waypoint, 0 ignores them entirely.
  beta: 0.94,
  opacity: 0.92,
};

// ---------------------------------------------------------------------------
// Leaves
// ---------------------------------------------------------------------------
export const LEAVES = {
  // A seedling's first leaves are a large share of the whole plant.
  length: { seedling: 20, mature: 14 } as GrowthRange,
  widthRatio: 0.34,
  // Where along the leaf its widest point sits, as a fraction of its length.
  bellyAlong: 0.45,
  fillOpacity: 0.8,
  coupleFillOpacity: 0.84,
  // The single stitch down the middle, as fractions of the leaf's length.
  veinFrom: 0.1,
  veinTo: 0.9,
  veinColor: '#000000',
  veinOpacity: 0.28,
  veinWidth: 0.7,
  // A name starts this far beyond the end of its own leaf.
  labelGap: 7,
  // How many samples back along its own branch to look when aiming a leaf.
  angleLookback: 4,
};

// ---------------------------------------------------------------------------
// Name labels
// ---------------------------------------------------------------------------
export const LABELS = {
  // Type holds its size on screen, but never grows past the gap between leaves.
  minFontSize: 13,
  maxFontSize: 17,
  fontSizeFromGap: 0.46,
  lineHeightRatio: 1.35,
  // How far a name may be nudged from its own leaf to clear its neighbours, in
  // lines. Past a few lines a name has left its leaf behind, and an overlap
  // reads better than a mislabelled branch.
  maxDriftLines: 3,
  // Each name is checked against this many recent neighbours, not just the one
  // directly above it: a short name sitting between two long ones overlaps
  // neither of its immediate neighbours while the pair either side of it
  // collide, and comparing only backwards one step misses exactly that case.
  neighboursChecked: 8,
  // Rough width of one character, as a fraction of type size — once for
  // collision testing, once for deciding where to truncate.
  charWidthRatio: 0.5,
  truncateCharWidthRatio: 0.54,
  // Keep-out margin at the left and right edges of the frame.
  edgeMargin: 18,
  minChars: 12,
  maxChars: 28,
};

// ---------------------------------------------------------------------------
// The root system
// ---------------------------------------------------------------------------
// Every thread begins at one of these tips and runs unbroken up through the
// collar into the trunk, so root, trunk and bough are the same piece of wood
// rather than three drawings stacked on each other. Elizabeth's people share
// her root and Raymond's share his, which is what makes those two read as thick
// cluster roots; anyone belonging to both gets a rootlet of their own between
// them.
//
// A sapling holds on with barely a toehold: the roots start teeny and only
// deepen and spread as the guest list they anchor grows. Both figures are
// multiples of the trunk's height.
export const ROOTS = {
  drop: { seedling: 0.1, mature: 0.4 } as GrowthRange,
  spread: { seedling: 0.18, mature: 0.66 } as GrowthRange,
  // How far above the ground line the two root clusters meet.
  collarRise: 0.06,
  // Rootlets for guests who belong to both sides fan out between the two
  // cluster roots, as fractions of the full spread and drop.
  sharedSpreadRatio: 0.9,
  sharedDropRatio: 0.82,
};

// ---------------------------------------------------------------------------
// The couple's braid
// ---------------------------------------------------------------------------
// Two cords, one each, rising from their own roots, braiding up the trunk and
// parting at the trunk top to sweep into their own half of the crown. They are
// the one place girth is a design decision rather than a headcount, so they
// take an explicit amplitude and are drawn as filled ribbons.
export const BRAID = {
  // Lobes are the open lens shapes between crossings. Three lobes take four
  // coincident points: the two window edges plus two crossings inside.
  lobes: 6,
  // Where the braid lives, as progress along the cord. These are knot
  // positions, not distances: sampling is uniform in spline parameter, so with
  // five knots the cord sits at the collar at exactly one third of its samples
  // and at the trunk top at one half, whatever the tree's proportions — the
  // window holds for seedling and mature tree alike.
  //
  // It opens at the collar and closes exactly at the trunk top, the last point
  // the two cords' centrelines still coincide. Closing there is what lets the
  // final lobe run straight out into the branches: the winding is back at zero
  // just as the two cords part, so each leaves the braid already on its own
  // centreline and sweeps away smoothly. Carrying swingEnd any higher buys a
  // lobe that can never close — the cords are by then winding around two
  // separate paths into opposite halves of the crown, so it reads as a kink in
  // each cord rather than a crossing.
  swingStart: 0.34,
  swingEnd: 0.5,
  // A lobe's width as a multiple of its own height — a little wider than tall,
  // so each crossing reads as an open lens rather than a pinched knot. Being a
  // multiple of the height is the whole point: both figures come from the same
  // measured stretch of cord, so the braid is the same shape at every size of
  // tree. Setting the swing from the trunk's girth instead let this ratio drift
  // from 0.7 on a two-thread seedling to over 2 on a full crown — lobes taller
  // than they were wide at one end of the guest list and flat chevrons at the
  // other, which is what made them look like different bulges.
  lobeAspect: 1.35,
  // How sharply the swing opens and closes at the window edges, as a fraction
  // of the window. Just enough to round off the sample right at the switch.
  swingEase: .9,
  // Exponent on each lobe belly: below 1 fattens the arc toward a semicircle
  // (rope on a cylinder); above 1 pinches crossings into a sine-wave chevron.
  lobeRoundness: 0.72,
  // Third-harmonic mix that rounds the waist between crossings, the standard
  // Celtic-interlace trick — kept small so crossings stay crisp.
  interlaceHarmonic: 0.11,
  // The lobes are spaced evenly in distance travelled, not in knots passed, so
  // they come out the same height as one another. That needs the braid window
  // sampled densely enough for each lobe to read as a round curve — far denser
  // than a guest thread that curves gently the whole way.
  samples: 480,
  // Slackens the cord towards a straight run between its knots.
  beta: 0.95,
  // The cords earn their girth from everyone else: with no replies each is
  // barely heavier than a single guest thread (seedling is 0.7 × THREADS.width),
  // and every arrival thickens it along the same curve the tree grows by.
  peakHalfWidth: { seedling: 1.05, mature: 5.8 } as GrowthRange,
  // Girth over the run: swelling from the root tip to full cord by the time the
  // braid starts, holding that full girth for every lobe, then thinning to
  // nothing out in the branches. The plateau is pinned to the swing window
  // itself rather than to fixed fractions of the run, which is what makes the
  // lobes identically thick at every size of tree.
  taperInExponent: 2.5,
  taperOutExponent: 1.35,
  // Which way each cord finally sweeps, in degrees. Steep enough that each one
  // climbs into its own half of the canopy rather than lying flat underneath.
  elizabethSweepDeg: -128,
  raymondSweepDeg: -52,
  // The two knots out in the crown, as fractions of the crown's reach. The
  // first sits halfway between straight up and the final sweep direction.
  midKnotReach: 0.3,
  tipKnotReach: 0.62,
  // A floor on that reach for a crown too small to give the cords anywhere to
  // go, in trunk heights.
  minReachInTrunks: 1.5,
  // How many samples back from the tip to look when aiming the end leaf.
  tipAngleLookback: 4,
};

// ---------------------------------------------------------------------------
// Curve smoothing
// ---------------------------------------------------------------------------
export const CURVE = {
  // Catmull-Rom tension, applied to every path in the drawing — the guest
  // threads and the outlines of the couple's cord ribbons alike. Higher rounds
  // corners harder; 0 is a straight polyline through the samples. If the braid's
  // crossings ever look angular, this is the second thing to try after
  // BRAID.samples.
  tension: 0.6,
};

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------
export const PALETTE = {
  barkDeep: '#6f5325',
  bark: '#9b7b4c',
  // Limbs lose light as well as colour as they reach. A thread that ran all the
  // way out at full strength arrived at its own name in exactly the colour that
  // name is written in, right where the label sits — so the last stretch of
  // every spoke fades to this dusty brown instead, and only the leaf and the
  // name carry the guest's colour at full strength.
  twigTip: '#4f483d',
  // How far the tip is pulled towards twigTip: enough to sit well below the
  // text in brightness, but short of neutral, so the sides still read apart.
  twigFade: 0.78,
  // Where along a thread it reaches full bark colour.
  barkStop: 0.32,
  elizabeth: '#8BBEF0',
  raymond: '#B26069',
  // Where blue and maroon meet in the middle of the tree — names and strands
  // both lighten here as they cross the centre.
  spectrumCenter: '#eef0f4',
  // How far out a point has to sit to be fully its own side's colour, as a
  // fraction of the half span, and the shaping on the way there. Reaching full
  // colour only at the frame's edge left almost every name a pale wash of
  // silver, so the ramp finishes inside the crown and an exponent below 1 gets
  // it moving immediately.
  spectrumFullAt: 0.42,
  spectrumEase: 0.5,
  // How far a strand lifts back toward silver as it passes through the trunk.
  // Enough that the weave still brightens at the centre, short of the pure
  // silver that used to paint the whole trunk white.
  threadCenterLift: 0.28,
  // How far strand ends are pulled dark at root and tip so names read brighter
  // on top. Tip reuses twigFade; root mixes toward cordRootShade.
  strandRootDarken: 0.55,
  // A cord carries its owner's colour the whole way — darker under the ground,
  // full strength through the trunk, softening as it thins out among their
  // people.
  cordRootShade: '#2a2118',
  // How far a leaf's fill is pulled toward cordRootShade, so leaves read
  // darker than the name and thread colour they're mixed from.
  leafDarken: 0.22,
  cordRootMix: 0.62,
  cordFullStop: 0.38,
  cordTipMix: 0.45,
  // How far up the crown the cord's gradient is stretched, as a fraction of the
  // crown's reach above the trunk top.
  cordGradientReach: 0.5,
  // The pool of light on the ground under the tree.
  groundGlow: '#d9b26a',
  groundGlowOpacity: 0.14,
  groundGlowDrop: 28,
  groundGlowFromCrown: 0.62,
  groundGlowFromTrunk: 0.6,
  groundGlowFlatten: 0.17,
};

// ---------------------------------------------------------------------------
// The couple's names and the line beneath them
// ---------------------------------------------------------------------------
export const SIGNATURE = {
  fontSize: 27,
  // Gap either side of the centre line, and drop below the ground line.
  xGap: 14,
  yDrop: 76,
  taglineFontSize: 17,
  taglineDrop: 118,
  taglineColor: '#c2c6cd',
  taglineOpacity: 0.8,
  taglineLetterSpacing: '0.14em',
};

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------
export const MOTION = {
  // Every strand carries a CSS transition, so each new arrival re-weaves the
  // tree rather than repainting it.
  reweaveMs: 1100,
  // How long one thread takes to draw itself from root to leaf. A leaf may not
  // appear until its own branch has finished arriving, so this figure sets both
  // the CSS duration and the leaf's delay — keeping them in one place is what
  // stops a leaf from budding on a branch still growing towards it.
  threadDrawSeconds: 2.4,
  leafFadeSeconds: 1.3,
  // The faster clock used when a single new arrival is being celebrated.
  singleThreadDrawSeconds: 1.2,
  singleLeafFadeSeconds: 0.75,
  singleDelaySeconds: 0.05,
  // The staggered entrance: when the first branch starts, and how much later
  // each subsequent one follows.
  staggerStartSeconds: 0.3,
  staggerPerSlotSeconds: 0.012,
  drawEasing: 'cubic-bezier(0.36, 0, 0.28, 1)',
  // The whole tree's idle sway.
  swaySeconds: 11,
  swayDegrees: 0.28,
};
