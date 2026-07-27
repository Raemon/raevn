import type { TapestryPerson } from './tapestryTypes';
import { groupIntoFamilies } from './tapestryOrdering';

// The strand model of a tree (Holton, "Strands, gravity and botanical tree
// imagery", 1994; the routing is Holten's hierarchical edge bundling, 2006):
// every guest is one continuous thread running from the ground to their own
// name, and threads that share a route twist together into a bundle. A limb is
// not a shape with a width — it is however many threads happen to be travelling
// together at that point, which satisfies da Vinci's rule for free and makes
// the trunk literally woven out of the guest list.
//
// This suits the data in a way a growth algorithm cannot: the hierarchy is
// already there (side → family → person), every name is reached exactly once,
// and adding a guest adds a thread instead of regrowing the whole crown — so
// the tree can be transitioned from sapling to full canopy as replies arrive.

export type Vec = { x: number; y: number };

// One waypoint on a thread's journey, carrying the size of the bundle it is
// travelling in at that moment — the trunk knows it holds everyone, a twig
// knows it holds one household.
export type StrandAnchor = { point: Vec; load: number };

export type StrandSlot = {
  person: TapestryPerson;
  slotIndex: number;
  theta: number;
  radius: number;
};

// Every strand is sampled to the same number of points so that a re-render can
// interpolate `d` from the old path to the new one: CSS can only tween two path
// strings that share a command structure.
export const STRAND_SAMPLES = 72;

// Family nodes sit just inside the leaves they carry; forks further up are
// pulled progressively closer to the trunk. Both are expressed as a fraction of
// the nearest leaf above them, which keeps radius strictly increasing from root
// to tip along every thread — no limb ever doubles back.
const FAMILY_RADIUS_FRACTION = 0.91;
const FORK_RADIUS_CEILING = 0.86;
// Each level of forking covers this share of the distance still left to the
// leaves, so forks land at roughly 0.30, 0.51, 0.66, 0.76 … of the way out
// rather than piling up near the trunk and leaving long parallel runs.
const FORK_RADIUS_FALLOFF = 0.7;
// Families per fork before the group splits again. Recursive halving means the
// crown's branching depth grows with the guest list on its own.
const MAX_FAMILIES_PER_FORK = 2;

type Cluster = {
  slots: StrandSlot[];
  children: Cluster[];
  depth: number;
};

const meanTheta = (slots: StrandSlot[]) =>
  slots.reduce((sum, slot) => sum + slot.theta, 0) / Math.max(slots.length, 1);

const minRadius = (slots: StrandSlot[]) =>
  slots.reduce((lowest, slot) => Math.min(lowest, slot.radius), Infinity);

// Split a side's families in half, and half again, until a fork carries only a
// couple of households. Halving (rather than a fixed fan-out) keeps neighbouring
// families on neighbouring branches, so a household still reads as one cluster.
const buildCluster = (families: StrandSlot[][], depth: number): Cluster => {
  const slots = families.flat();
  if (families.length <= MAX_FAMILIES_PER_FORK) {
    return {
      slots,
      depth,
      children: families.map((family) => ({ slots: family, children: [], depth: depth + 1 })),
    };
  }
  const middle = Math.ceil(families.length / 2);
  return {
    slots,
    depth,
    children: [
      buildCluster(families.slice(0, middle), depth + 1),
      buildCluster(families.slice(middle), depth + 1),
    ],
  };
};

const forkRadius = (cluster: Cluster) =>
  minRadius(cluster.slots) *
  Math.min(FORK_RADIUS_CEILING, 1 - Math.pow(FORK_RADIUS_FALLOFF, cluster.depth));

// Walk every root→leaf route, recording the waypoints each thread passes
// through and how much company it has at each one. A thread does not begin at
// the ground — it begins at the tip of a root, and `rootPrefixById` supplies the
// waypoints from that tip up to the collar, so a strand is one unbroken run of
// wood from underground to its own name.
export const buildStrandAnchors = (
  slots: StrandSlot[],
  polar: (theta: number, radius: number) => Vec,
  rootPrefixById: Map<string, StrandAnchor[]>,
  trunkTop: StrandAnchor,
): Map<string, StrandAnchor[]> => {
  const anchorsByPerson = new Map<string, StrandAnchor[]>();
  if (slots.length === 0) return anchorsByPerson;

  const slotsById = new Map(slots.map((slot) => [slot.person.id, slot]));
  const familiesBySide = new Map<string, StrandSlot[][]>();
  for (const family of groupIntoFamilies(slots.map((slot) => slot.person))) {
    const familySlots = family.members
      .map((member) => slotsById.get(member.id))
      .filter((slot): slot is StrandSlot => Boolean(slot));
    if (familySlots.length === 0) continue;
    const existing = familiesBySide.get(family.side);
    if (existing) existing.push(familySlots);
    else familiesBySide.set(family.side, [familySlots]);
  }

  const descend = (cluster: Cluster, trail: StrandAnchor[]) => {
    const here: StrandAnchor[] = [
      ...trail,
      {
        point: polar(meanTheta(cluster.slots), forkRadius(cluster)),
        load: cluster.slots.length,
      },
    ];
    if (cluster.children.length === 0) {
      // A family: one last waypoint just inside its leaves, then each member
      // peels off to their own name.
      const familyAnchor: StrandAnchor = {
        point: polar(meanTheta(cluster.slots), minRadius(cluster.slots) * FAMILY_RADIUS_FRACTION),
        load: cluster.slots.length,
      };
      for (const slot of cluster.slots) {
        anchorsByPerson.set(slot.person.id, [
          ...(rootPrefixById.get(slot.person.id) ?? []),
          trunkTop,
          ...here,
          familyAnchor,
          { point: polar(slot.theta, slot.radius), load: 1 },
        ]);
      }
      return;
    }
    for (const child of cluster.children) descend(child, here);
  };

  for (const families of familiesBySide.values()) {
    descend(buildCluster(families, 1), []);
  }
  return anchorsByPerson;
};

// A uniform cubic B-spline through the waypoints, with the ends tripled so the
// curve actually starts at the ground and lands on the leaf. `beta` slackens the
// bundle towards a straight run the way d3's curveBundle does: 1 hugs every
// waypoint, 0 ignores them entirely.
const sampleBundleSpline = (controls: Vec[], beta: number, samples: number): Vec[] => {
  const first = controls[0];
  const last = controls[controls.length - 1];
  const span = controls.length - 1;
  const relaxed = controls.map((control, index) => {
    const t = span === 0 ? 0 : index / span;
    const chordX = first.x + (last.x - first.x) * t;
    const chordY = first.y + (last.y - first.y) * t;
    return { x: beta * control.x + (1 - beta) * chordX, y: beta * control.y + (1 - beta) * chordY };
  });

  const padded = [relaxed[0], relaxed[0], ...relaxed, last, last];
  const segments = padded.length - 3;
  const points: Vec[] = [];
  for (let i = 0; i <= samples; i++) {
    const u = (i / samples) * segments;
    const segment = Math.min(Math.floor(u), segments - 1);
    const t = u - segment;
    const [p0, p1, p2, p3] = padded.slice(segment, segment + 4);
    const t2 = t * t;
    const t3 = t2 * t;
    const w0 = (1 - t) * (1 - t) * (1 - t);
    const w1 = 3 * t3 - 6 * t2 + 4;
    const w2 = -3 * t3 + 3 * t2 + 3 * t + 1;
    const w3 = t3;
    points.push({
      x: (w0 * p0.x + w1 * p1.x + w2 * p2.x + w3 * p3.x) / 6,
      y: (w0 * p0.y + w1 * p1.y + w2 * p2.y + w3 * p3.y) / 6,
    });
  }
  return points;
};

// A stroke is one width for its whole length, which cannot express a cord that
// starts as a thin rootlet, swells into the trunk and thins away into the
// canopy. So the couple's two cords are drawn as filled ribbons instead: walk
// the centreline offsetting by the half-width on one side, come back along the
// other, and close. `outline` turns the two sides into a single closed path.
//
// The fill and its dark casing are returned as separate paths because the
// casing must not close: stroking the closed ribbon draws a bar straight across
// the cord at both cut ends, and a cord assembled from weave runs is cut at
// every crossing — each bar reads as a pipe joint. `edges` carries only the two
// long sides, as two open subpaths.
export const buildRibbon = (
  centreline: Vec[],
  halfWidthAt: (progress: number) => number,
  outline: (points: Vec[]) => string | null,
): { fill: string; edges: string } => {
  const nearSide: Vec[] = [];
  const farSide: Vec[] = [];
  centreline.forEach((point, index) => {
    const previous = centreline[Math.max(index - 1, 0)];
    const next = centreline[Math.min(index + 1, centreline.length - 1)];
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const tangentLength = Math.hypot(tangentX, tangentY) || 1;
    const normalX = -tangentY / tangentLength;
    const normalY = tangentX / tangentLength;
    const halfWidth = halfWidthAt(index / (centreline.length - 1));
    nearSide.push({ x: point.x + normalX * halfWidth, y: point.y + normalY * halfWidth });
    farSide.push({ x: point.x - normalX * halfWidth, y: point.y - normalY * halfWidth });
  });
  const out = outline(nearSide);
  const back = outline([...farSide].reverse());
  if (!out || !back) return { fill: '', edges: '' };
  return { fill: `${out} L${back.slice(1)} Z`, edges: `${out} ${back}` };
};

export type StrandWeaveOptions = {
  // Centre-to-centre spacing of threads inside a bundle: a bundle of n threads
  // is about spacing·√n across, so the trunk thickens as the guest list grows
  // without any width rule being written down.
  threadSpacing: number;
  // Full twists from ground to leaf tip.
  twistTurns: number;
  // Where this thread sits in the rotation, so companions in a bundle spiral
  // around one another instead of overlapping.
  phase: number;
  beta: number;
  // Overrides the bundle-size rule entirely, for strands whose girth is a
  // design decision rather than a headcount — the couple's own two cords.
  amplitudeAt?: (progress: number) => number;
  // Overrides the uniform arc-length winding entirely. The default spreads
  // `twistTurns` evenly along the whole strand, which is right for a thread
  // twisting in a bundle — but a braid that only opens over one stretch of the
  // run needs its crossings pinned inside that stretch, in the same progress
  // terms `amplitudeAt` uses.
  turnAt?: (progress: number) => number;
  // Sample count override. A braid confined to a short window of the run
  // needs more samples than a thread that curves gently all the way, or its
  // lobes come out with only a handful of points each and read as jagged.
  samples?: number;
};

// Threads gather to a point at the very tip of their root, then fan apart as
// they rise: without this every thread in a cluster would arrive underground
// still spread across the full width of the bundle, and the root would read as a
// frayed broom rather than one tapering spike. The taper runs well past the
// soil line and is concave (squared), so everything underground stays a thin
// rootlet and the bundle only takes on its full girth up in the trunk — a
// linear ramp ending underground made the roots as fat as the trunk itself.
const ROOT_CONVERGE = 0.26;
const ROOT_PINCH = 2.1;

// A woven strand knows not only where it runs but where it is in its own
// rotation at every step. `swing` is that rotation as a signed value: positive
// where the strand is on the near side of the bundle, negative on the far side.
// Two strands wound in opposite phase are therefore never on the same side at
// once, which is what lets a braid be drawn correctly.
export type WovenStrand = { points: Vec[]; swing: number[] };

// Route one guest's thread: bundle-spline through the waypoints, then wind it
// around that centreline by an amount that follows the local bundle size and
// falls to nothing at the leaf, so the thread arrives exactly on its name.
export const buildStrandPath = (
  anchors: StrandAnchor[],
  options: StrandWeaveOptions,
): Vec[] => buildWovenStrand(anchors, options).points;

export const buildWovenStrand = (
  anchors: StrandAnchor[],
  { threadSpacing, twistTurns, phase, beta, amplitudeAt, turnAt, samples }: StrandWeaveOptions,
): WovenStrand => {
  const centreline = sampleBundleSpline(
    anchors.map((anchor) => anchor.point),
    beta,
    samples ?? STRAND_SAMPLES,
  );

  const cumulative = [0];
  for (let i = 1; i < centreline.length; i++) {
    cumulative.push(
      cumulative[i - 1] + Math.hypot(centreline[i].x - centreline[i - 1].x, centreline[i].y - centreline[i - 1].y),
    );
  }
  const totalLength = cumulative[cumulative.length - 1] || 1;

  // Bundle size is known at the waypoints; spread it over the sampled curve by
  // the waypoint's position in the chain.
  const loadAt = (progress: number) => {
    const scaled = progress * (anchors.length - 1);
    const index = Math.min(Math.floor(scaled), anchors.length - 2);
    const t = scaled - index;
    return anchors[index].load + (anchors[index + 1].load - anchors[index].load) * t;
  };

  const points: Vec[] = [];
  const swings: number[] = [];
  centreline.forEach((point, index) => {
    const progress = index / (centreline.length - 1);
    const previous = centreline[Math.max(index - 1, 0)];
    const next = centreline[Math.min(index + 1, centreline.length - 1)];
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const tangentLength = Math.hypot(tangentX, tangentY) || 1;
    const normalX = -tangentY / tangentLength;
    const normalY = tangentX / tangentLength;
    const amplitude =
      amplitudeAt?.(progress) ??
      threadSpacing *
        Math.sqrt(loadAt(progress)) *
        0.5 *
        (1 - Math.pow(progress, 2.6)) *
        Math.min(1, Math.pow(progress / ROOT_CONVERGE, ROOT_PINCH));
    const turn =
      turnAt?.(progress) ??
      Math.sin(2 * Math.PI * twistTurns * (cumulative[index] / totalLength) + phase);
    const swing = amplitude * turn;
    points.push({ x: point.x + normalX * swing, y: point.y + normalY * swing });
    swings.push(turn);
  });
  return { points, swing: swings };
};

// Cut a woven strand at every point where it passes its partner — the moments
// its rotation changes sign. Painting every "behind" run before every "in front"
// run is what turns two crossing curves into a braid: at each crossing the
// strand nearer the viewer is laid down last, so it visibly passes over.
export type WeaveRun = { start: number; end: number; front: boolean };

// How far each run continues past the crossing it was cut at. One shared
// sample merely lets the ribbons meet; a couple more makes the front ribbon
// visibly lie ACROSS the back one, which is what sells each over-pass.
const RUN_OVERLAP = 2;

export const splitIntoWeaveRuns = (swing: number[]): WeaveRun[] => {
  const runs: WeaveRun[] = [];
  const last = swing.length - 1;
  let start = 0;
  for (let i = 1; i < swing.length; i++) {
    const crossed = swing[i] >= 0 !== swing[i - 1] >= 0;
    if (!crossed) continue;
    runs.push({
      start: Math.max(0, start - RUN_OVERLAP),
      end: Math.min(last, i + RUN_OVERLAP - 1),
      front: swing[start] >= 0,
    });
    start = i;
  }
  runs.push({
    start: Math.max(0, start - RUN_OVERLAP),
    end: last,
    front: swing[start] >= 0,
  });
  return runs;
};
