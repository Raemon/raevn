import { line, curveCatmullRom } from 'd3-shape';
import { playfair, cormorant } from '../handfasting-simple/save-the-date/handfastingInvitationTypography';
import { pickThreadColor, truncateName } from './tapestryPalette';
import { orderPersonsForTapestry } from './tapestryOrdering';
import { createSeededRandom } from './tapestrySeededRandom';
import {
  buildRibbon,
  buildStrandAnchors,
  buildStrandPath,
  buildWovenStrand,
  splitIntoWeaveRuns,
  type StrandAnchor,
  type StrandSlot,
  type Vec,
} from './strandTree';
import TapestryNameLabel from './TapestryNameLabel';
import type { TapestryEntrance, TapestryPerson } from './tapestryTypes';

// A tree embroidered out of thread. Every guest is one continuous strand
// running from the ground to their own name; strands that travel together twist
// into a bundle, so the trunk is visibly woven from the whole guest list and
// frays into single threads at the crown's edge. Nothing here has a "branch
// width" — a limb is just how many people are travelling together at that point.
//
// It is also a clock. With no replies yet it is a small seedling of two threads,
// and every household that answers thickens the weave and widens the crown. The
// frame is cut to whatever the tree currently is — a seedling gets a seedling's
// frame rather than a page of empty sky above it — so it grows by taking up more
// of the page, not by filling in reserved space.

const CANOPY_X = 700;
const ROOT_Y = 1015;
// Wide, and only as deep as the tree standing in it: the top edge is cut from
// the crown's own extent at render time (see `viewTop` below), and the 90vh cap
// on the <svg> scales the whole thing down rather than cropping when a mature
// crown outgrows the viewport.
const VIEW_W = 1400;
// Room below the ground line for the roots to reach into and the couple's names
// to sit under them without the two tangling.
const VIEW_BOTTOM = ROOT_Y + 132;
// A dome rather than a full circle: the crown reaches almost to horizontal on
// each side, so no limb has to travel downwards to be reached.
const SECTOR_START = (-176 * Math.PI) / 180;
const SECTOR_END = (-4 * Math.PI) / 180;
// Crowns are wider than they are tall, but only slightly: the flatter the
// crown, the more names share a height, and names sharing a height is the whole
// difficulty. Nearly all the vertical room the trunk gives up is spent here.
const CROWN_SQUASH = 0.95;
const BARK_DEEP = '#6f5325';
const BARK = '#9b7b4c';
// Limbs lose light as well as colour as they reach. A thread that ran all the
// way out at full strength arrived at its own name in exactly the colour that
// name is written in, right where the label sits — so the last stretch of every
// spoke fades to this dusty brown instead, and only the leaf and the name carry
// the guest's colour at full strength.
const TWIG_TIP = '#4f483d';
// How far the tip is pulled towards TWIG_TIP: enough to sit well below the
// text in brightness, but short of neutral, so the sides still read apart.
const TWIG_FADE = 0.78;
const ELIZABETH_THREAD = '#a9bbd1';
const RAY_THREAD = '#c9a45c';
// Every strand carries a CSS transition, so each new arrival re-weaves the tree
// rather than repainting it. Sampling every strand to the same point count is
// what makes `d` interpolable at all.
const REWEAVE_TRANSITION = 'd 1100ms ease';
// How fast the seedling becomes a tree: saturating, so the first few replies
// visibly grow it and a long list still lands near the mature proportions.
const GROWTH_SATURATION = 16;
// How long one thread takes to draw itself from root to leaf. A leaf may not
// appear until its own branch has finished arriving, so this figure sets both
// the CSS duration and the leaf's delay — keeping them in one constant is what
// stops a leaf from budding on a branch that is still growing towards it.
const THREAD_DRAW_SECONDS = 2.4;
// The couple's braid, counted in lobes — the open lens shapes between
// crossings. Four lobes make three crossings, evenly spaced up the trunk.
// The winding is pinned to the swing window (below) rather than spread over
// the cord's whole arc length, so every crossing lands where the swing is
// actually open and each one reads as a clear over-or-under pass.
const CORD_LOBES = 4;
// Where the braid lives, as progress along the cord. These are knot
// positions, not arc lengths: sampling is uniform in spline parameter, so
// with five anchors the cord sits at the collar at exactly one third of its
// samples and at the trunk top at one half, whatever the tree's proportions —
// the window holds for seedling and mature tree alike. It opens at the collar
// and closes a little above the trunk top, which is as far as the two cords'
// centrelines still coincide; a crossing scheduled beyond that point never
// visually intersects, because each cord is by then winding around its own
// separate path out into the crown.
const CORD_SWING_START = 0.34;
const CORD_SWING_END = 0.6;
const cordWindAt = (progress: number) =>
  Math.min(1, Math.max(0, (progress - CORD_SWING_START) / (CORD_SWING_END - CORD_SWING_START)));
// The braid window spans only a quarter of the samples, so the cords are
// sampled at double density to keep each lobe a round curve.
const CORD_SAMPLES = 144;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const mixHex = (from: string, to: string, t: number) => {
  const channel = (hex: string, offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  const blended = [1, 3, 5].map((offset) =>
    Math.round(lerp(channel(from, offset), channel(to, offset), t))
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${blended.join('')}`;
};

const smoothPath = line<Vec>()
  .x((p) => p.x)
  .y((p) => p.y)
  .curve(curveCatmullRom.alpha(0.6));

// An embroidered leaf: two arcs meeting at the tip, with a single stitch laid
// down the middle for the vein.
const leafOutline = (length: number, width: number) =>
  `M 0 0 Q ${length * 0.45} ${-width} ${length} 0 Q ${length * 0.45} ${width} 0 0 Z`;

const TreeV4Tapestry = ({
  persons,
  entrance = 'staggered',
}: {
  persons: TapestryPerson[];
  entrance?: TapestryEntrance;
}) => {
  // When a branch starts drawing, and when the leaf on the end of it is allowed
  // to appear — always one full draw later, so the leaf lands on finished wood.
  const threadDelayFor = (slotIndex: number) =>
    entrance === 'staggered' ? 0.3 + slotIndex * 0.012 : 0.1;
  const leafDelayFor = (slotIndex: number) => threadDelayFor(slotIndex) + THREAD_DRAW_SECONDS;

  const growth = 1 - Math.exp(-persons.length / GROWTH_SATURATION);
  // The trunk is deliberately short — a stem for the crown to sit on, not the
  // subject. Height is the scarce dimension here, and every unit spent on trunk
  // is one the canopy cannot use to hold names apart.
  const trunkHeight = lerp(54, 96, growth);
  const ringBase = lerp(46, 248, growth);
  // Rings are spaced generously: two names on neighbouring rings should never
  // land close enough in height to need nudging apart afterwards.
  const ringStep = lerp(24, 84, growth);
  const canopyY = ROOT_Y - trunkHeight;

  const polar = (theta: number, radius: number): Vec => ({
    x: CANOPY_X + radius * Math.cos(theta),
    y: canopyY + radius * Math.sin(theta) * CROWN_SQUASH,
  });

  const ordered = orderPersonsForTapestry(persons);
  // More rings spread names over more radii, which is what keeps their flat
  // labels from landing at the same height as one another.
  const ringCount =
    ordered.length < 14 ? 1 : ordered.length < 32 ? 2 : ordered.length < 48 ? 3 : 4;
  const slots: StrandSlot[] = ordered.map((person, slotIndex) => {
    const random = createSeededRandom(`${person.id}::tree4-leaf`);
    const theta = lerp(SECTOR_START, SECTOR_END, (slotIndex + 0.5) / ordered.length);
    const ring = slotIndex % ringCount;
    const radius =
      (ringCount === 1 ? ringBase + 40 * growth : ringBase) +
      ring * ringStep +
      (random() - 0.5) * 22 * growth;
    return { person, slotIndex, theta, radius };
  });

  const crownReach = slots.reduce((widest, slot) => Math.max(widest, slot.radius), 0);
  const threadWidth = 1.5;
  const threadSpacing = 3.6;
  // A seedling's first leaves are a large share of the whole plant.
  const leafLength = lerp(20, 14, growth);
  const leafWidth = leafLength * 0.34;
  // A name starts beyond the end of its own leaf.
  const labelGap = leafLength + 7;

  // The root system. Every thread in the tree begins at one of these tips and
  // runs unbroken up through the collar into the trunk, so root, trunk and bough
  // are the same piece of wood rather than three drawings stacked on each other.
  // Elizabeth's people share her root and Raymond's share his, which is what
  // makes those two read as thick cluster roots; anyone belonging to both gets a
  // rootlet of their own between them.
  const rootDrop = trunkHeight * 0.36;
  const rootSpread = trunkHeight * 0.62;
  const elizabethRoot: Vec = { x: CANOPY_X - rootSpread, y: ROOT_Y + rootDrop };
  const raymondRoot: Vec = { x: CANOPY_X + rootSpread, y: ROOT_Y + rootDrop };
  const collar: Vec = { x: CANOPY_X, y: ROOT_Y - trunkHeight * 0.06 };
  const trunkTop: StrandAnchor = { point: { x: CANOPY_X, y: canopyY }, load: slots.length };

  const sharedSlots = slots.filter((slot) => slot.person.side === 'both');
  const rootPrefixById = new Map<string, StrandAnchor[]>();
  slots.forEach((slot) => {
    const sideCount = slots.filter((other) => other.person.side === slot.person.side).length;
    let tip: Vec;
    if (slot.person.side === 'elizabeth') tip = elizabethRoot;
    else if (slot.person.side === 'ray') tip = raymondRoot;
    else {
      // Shared friends fan out between the two cluster roots, one rootlet each.
      const place = sharedSlots.findIndex((other) => other.person.id === slot.person.id);
      const spread = sharedSlots.length > 1 ? place / (sharedSlots.length - 1) - 0.5 : 0;
      tip = { x: CANOPY_X + spread * rootSpread * 0.9, y: ROOT_Y + rootDrop * 0.82 };
    }
    rootPrefixById.set(slot.person.id, [
      { point: tip, load: sideCount },
      { point: collar, load: slots.length },
    ]);
  });

  const anchorsByPerson = buildStrandAnchors(slots, polar, rootPrefixById, trunkTop);

  const strands = slots.map((slot) => {
    const anchors = anchorsByPerson.get(slot.person.id);
    const phase = createSeededRandom(`${slot.person.id}::tree4-phase`)() * Math.PI * 2;
    return {
      slot,
      color: pickThreadColor(slot.person.side, slot.person.id),
      points: anchors
        ? buildStrandPath(anchors, { threadSpacing, twistTurns: 3.2, phase, beta: 0.94 })
        : [],
    };
  });

  const arcGapPx =
    ((SECTOR_END - SECTOR_START) / Math.max(slots.length, 1)) * ringCount * ringBase;
  // Type holds its size on screen, but never grows past the gap between leaves.
  const nameFontSize = Math.max(13, Math.min(17, arcGapPx * 0.46));

  // Names lie flat, so two leaves at the same height on the same side of the
  // crown collide however far apart their branches are. Walk each side top to
  // bottom and stack the labels — never the leaves — clear of the ones already
  // placed.
  //
  // Each name is checked against every recent neighbour, not just the one
  // directly above it: a short name sitting between two long ones overlaps
  // neither of its immediate neighbours while the pair either side of it
  // collide, and comparing only backwards one step misses exactly that case.
  // The drift is capped — past a few lines a name has left its own leaf behind,
  // and an overlap reads better than a mislabelled branch.
  const lineHeight = nameFontSize * 1.35;
  const maxLabelDrift = nameFontSize * 3;
  const NEIGHBOURS_CHECKED = 8;
  const labelY = new Map<string, number>();
  (['left', 'right'] as const).forEach((side) => {
    const rows = slots
      .map((slot) => {
        const point = polar(slot.theta, slot.radius + labelGap);
        return {
          id: slot.person.id,
          onLeft: Math.cos(slot.theta) < 0,
          x: point.x,
          restingY: point.y,
          y: point.y,
          width: slot.person.name.length * nameFontSize * 0.5,
        };
      })
      .filter((row) => row.onLeft === (side === 'left'))
      .sort((a, b) => a.y - b.y);

    const placed: typeof rows = [];
    for (const row of rows) {
      let wantedY = row.y;
      for (let i = Math.max(0, placed.length - NEIGHBOURS_CHECKED); i < placed.length; i++) {
        const other = placed[i];
        if (other.y + lineHeight <= wantedY) continue;
        const overlapsHorizontally =
          side === 'left'
            ? Math.min(other.x, row.x) > Math.max(other.x - other.width, row.x - row.width)
            : Math.min(other.x + other.width, row.x + row.width) > Math.max(other.x, row.x);
        if (overlapsHorizontally) wantedY = other.y + lineHeight;
      }
      row.y = Math.min(wantedY, row.restingY + maxLabelDrift);
      labelY.set(row.id, row.y);
      placed.push(row);
    }
  });

  // The couple's own two cords. Each one arcs up out of its owner's root
  // cluster — the same tip their own people's threads spring from, so the cord
  // reads as the thick parent root of that fan — meets the other at the
  // collar, winds around it twice up the trunk, and then parts ways, sweeping
  // into its owner's half of the crown to thin away among their people.
  // They are the one place girth is a design decision rather than a headcount,
  // so they take an explicit amplitude and are drawn as filled ribbons: thin
  // at the root tip, thick cord, tapering away.
  const trunkBundleRadius = threadSpacing * Math.sqrt(Math.max(slots.length, 1)) * 0.5;
  const cordPeakHalfWidth = lerp(4.2, 7.5, growth);
  // Girth over the run: swelling from the root tip to full cord by the soil
  // line, holding that full girth for the entire climb up the trunk, then
  // thinning to nothing out in the branches. The plateau is what keeps the
  // spiral evenly thick however large the crown grows — pinning the peak to a
  // fixed fraction of the run meant a big crown pushed it up into the boughs,
  // and the trunk stretch (a smaller share of a longer run) went slim.
  const cordHalfWidthAt = (progress: number) =>
    cordPeakHalfWidth *
    (progress < 0.14
      ? lerp(0.3, 1, progress / 0.14)
      : progress < 0.52
        ? 1
        : Math.pow(Math.max(0, 1 - (progress - 0.52) / 0.48), 1.35));
  // Swing wide enough to carry each cord across the trunk and out the other
  // side — narrower never separates the pair on screen. Dead level across the
  // whole window, so the spiral keeps one even radius the whole climb — the
  // winding sine is already zero at both window edges, so a flat amplitude
  // still opens and closes the braid smoothly. The whisper of easing at the
  // edges only rounds off the sample right at the switch.
  const cordAmplitudeAt = (progress: number) =>
    Math.max(trunkBundleRadius * 1.1, cordPeakHalfWidth * 1.9) *
    Math.min(1, Math.max(0, (progress - CORD_SWING_START) / 0.02)) *
    Math.min(1, Math.max(0, (CORD_SWING_END - progress) / 0.02));

  const coupleCords = (
    [
      // Steep enough that each cord climbs into its own half of the canopy
      // rather than lying flat underneath it.
      { key: 'elizabeth', color: ELIZABETH_THREAD, root: elizabethRoot, sweep: -128, phase: 0 },
      { key: 'raymond', color: RAY_THREAD, root: raymondRoot, sweep: -52, phase: Math.PI },
    ] as const
  ).map((cord) => {
    const reach = Math.max(crownReach, trunkHeight * 1.5);
    const woven = buildWovenStrand(
      [
        { point: cord.root, load: 1 },
        { point: collar, load: 1 },
        { point: trunkTop.point, load: 1 },
        // Halfway between straight up and the direction it finally sweeps.
        { point: polar((((cord.sweep - 90) / 2) * Math.PI) / 180, reach * 0.3), load: 1 },
        { point: polar((cord.sweep * Math.PI) / 180, reach * 0.62), load: 1 },
      ],
      {
        threadSpacing,
        // Unused for the cords — `turnAt` drives the winding instead.
        twistTurns: 0,
        phase: cord.phase,
        beta: 0.95,
        amplitudeAt: cordAmplitudeAt,
        turnAt: (progress: number) =>
          Math.sin(Math.PI * CORD_LOBES * cordWindAt(progress) + cord.phase),
        samples: CORD_SAMPLES,
      },
    );
    const centreline = woven.points;
    const lastIndex = centreline.length - 1;
    const tip = centreline[lastIndex];
    const approach = centreline[Math.max(lastIndex - 4, 0)];
    // One ribbon per pass, so the two cords can be interleaved by depth.
    const runs = splitIntoWeaveRuns(woven.swing).map((run, runIndex) => ({
      key: `${cord.key}-${runIndex}`,
      front: run.front,
      ...buildRibbon(
        centreline.slice(run.start, run.end + 1),
        (local) => cordHalfWidthAt(lerp(run.start, run.end, local) / lastIndex),
        (points) => smoothPath(points),
      ),
    }));
    return {
      ...cord,
      runs,
      tip,
      tipAngle: (Math.atan2(tip.y - approach.y, tip.x - approach.x) * 180) / Math.PI,
    };
  });

  // Cut the top of the frame to whatever is actually up there: the highest
  // name, or — before anyone has replied — the tip of the couple's own two
  // cords. Everything below the ground line is fixed, so only this edge moves,
  // and as the crown climbs the frame climbs with it.
  const contentTopY = Math.min(
    ...coupleCords.map((cord) => cord.tip.y - leafLength),
    ...slots.map((slot) =>
      Math.min(labelY.get(slot.person.id) ?? Infinity, polar(slot.theta, slot.radius).y),
    ),
  );
  // A margin of one line, so the topmost name is not written against the edge.
  const viewTop = contentTopY - nameFontSize * 1.5;
  const viewBox = `0 ${viewTop} ${VIEW_W} ${VIEW_BOTTOM - viewTop}`;

  // One layer of cord passes, either the ones that duck behind the trunk or
  // the ones that swing across the front of it. The fill and its dark casing
  // are separate paths: the casing strokes only the ribbon's two long edges,
  // because stroking the closed ribbon drew a bar across the cord at every
  // weave cut and the cords read as jointed metal pipe instead of thread.
  const cordRunLayer = (front: boolean) =>
    coupleCords.flatMap((cord) =>
      cord.runs
        .filter((run) => run.front === front)
        .map((run) => (
          <g key={run.key} className="rvtree4-cord">
            <path
              d={run.fill}
              style={{ transition: REWEAVE_TRANSITION }}
              fill={`url(#rvtree4-cord-${cord.key})`}
            />
            {/* Raymond's gold sits close to the bark it runs through, so the
                cords are cased in black: it is the outline, not the hue, that
                keeps them legible against the bundle they wrap — and it is
                what makes an over-pass read as an over-pass. */}
            <path
              d={run.edges}
              style={{ transition: REWEAVE_TRANSITION }}
              fill="none"
              stroke="#000000"
              strokeWidth={1.6}
              strokeOpacity={0.8}
            />
          </g>
        )),
    );

  return (
    <div className="relative mx-auto w-full max-w-none select-none" aria-label="Tree of confirmed guests">
      <style>{`
        .rvtree4-thread {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: rvtree4Draw ${THREAD_DRAW_SECONDS}s cubic-bezier(0.36, 0, 0.28, 1) forwards;
        }
        .rvtree4-cord {
          opacity: 0;
          animation: rvtree4Fade ${THREAD_DRAW_SECONDS}s ease forwards;
        }
        .rvtree4-leaf {
          opacity: 0;
          animation: rvtree4Fade 1.3s ease forwards;
        }
        .rvtree4-tree {
          transform-origin: ${CANOPY_X}px ${ROOT_Y}px;
          animation: rvtree4Sway 11s ease-in-out infinite alternate;
        }
        @keyframes rvtree4Draw { to { stroke-dashoffset: 0; } }
        @keyframes rvtree4Fade { to { opacity: 1; } }
        @keyframes rvtree4Sway {
          from { transform: rotate(-0.28deg); }
          to { transform: rotate(0.28deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rvtree4-thread { animation: none; stroke-dashoffset: 0; transition: none !important; }
          .rvtree4-cord { animation: none; opacity: 1; transition: none !important; }
          .rvtree4-leaf { animation: none; opacity: 1; transition: none !important; }
          .rvtree4-tree { animation: none; }
        }
      `}</style>
      {/* The frame is cut to the tree, so a seedling is already short; the cap
          is the guarantee for very wide screens, where a mature crown would
          otherwise grow taller than the viewport. When it bites, the drawing
          scales down and centres rather than being cropped. */}
      <svg
        viewBox={viewBox}
        className="mx-auto block h-auto w-full"
        style={{ maxHeight: '90vh' }}
        role="img"
      >
        <defs>
          <radialGradient id="rvtree4-ground-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d9b26a" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#d9b26a" stopOpacity="0" />
          </radialGradient>
          {/* Each thread is deep bark at the root, brightest through the boughs
              where it runs with everyone else, then fades out along its final
              spoke so the name at the end of it is the brightest thing there. */}
          {strands.map(({ slot, color, points }) =>
            points.length === 0 ? null : (
              <linearGradient
                key={slot.person.id}
                id={`rvtree4-thread-${slot.slotIndex}`}
                gradientUnits="userSpaceOnUse"
                x1={points[0].x}
                y1={points[0].y}
                x2={points[points.length - 1].x}
                y2={points[points.length - 1].y}
              >
                <stop offset="0%" stopColor={BARK_DEEP} />
                <stop offset="32%" stopColor={BARK} />
                <stop offset="100%" stopColor={mixHex(color, TWIG_TIP, TWIG_FADE)} />
              </linearGradient>
            ),
          )}
          {/* A cord carries its owner's colour the whole way — darker under the
              ground, full strength through the trunk, softening as it thins out
              among their people. */}
          {coupleCords.map((cord) => (
            <linearGradient
              key={cord.key}
              id={`rvtree4-cord-${cord.key}`}
              gradientUnits="userSpaceOnUse"
              x1={cord.root.x}
              y1={cord.root.y}
              x2={CANOPY_X}
              y2={canopyY - crownReach * 0.5}
            >
              <stop offset="0%" stopColor={mixHex(cord.color, '#2a2118', 0.62)} />
              <stop offset="38%" stopColor={cord.color} />
              <stop offset="100%" stopColor={mixHex(cord.color, TWIG_TIP, 0.45)} />
            </linearGradient>
          ))}
        </defs>

        <ellipse
          cx={CANOPY_X}
          cy={ROOT_Y + 28}
          rx={Math.max(crownReach * 0.62, trunkHeight * 0.6)}
          ry={Math.max(crownReach * 0.62, trunkHeight * 0.6) * 0.17}
          fill="url(#rvtree4-ground-glow)"
          style={{ transition: 'rx 1100ms ease, ry 1100ms ease' }}
        />
        <g className="rvtree4-tree">
          {/* The two of us: one cord each, rising from its own root, braiding
              through the trunk and thinning away into its owner's half of the
              crown. Every run that passes behind goes down first — underneath
              the guest threads, so the cord visibly disappears behind the
              trunk itself — then the trunk, then every run that passes in
              front. Because the two cords are wound in opposite phase they
              alternate, so each takes its turn over and under and the pair
              reads as one braided rope wrapped around the tree rather than
              two curves that happen to cross. */}
          {cordRunLayer(false)}

          {/* Every guest, one thread each, ground to name */}
          {strands.map(({ slot, points }) =>
            points.length === 0 ? null : (
              <path
                key={slot.person.id}
                d={smoothPath(points) ?? ''}
                pathLength={1}
                className="rvtree4-thread"
                style={{
                  animationDelay: `${threadDelayFor(slot.slotIndex).toFixed(2)}s`,
                  transition: REWEAVE_TRANSITION,
                }}
                fill="none"
                stroke={`url(#rvtree4-thread-${slot.slotIndex})`}
                strokeWidth={threadWidth}
                strokeLinecap="round"
                strokeOpacity={0.92}
              />
            ),
          )}

          {cordRunLayer(true)}

          {/* Their own two leaves, on the ends of their own cords — the first
              leaves the seedling ever had, still there under the finished
              crown. */}
          {coupleCords.map((cord) => (
            <g
              key={`${cord.key}-leaf`}
              transform={`translate(${cord.tip.x} ${cord.tip.y}) rotate(${cord.tipAngle})`}
              style={{ transition: 'transform 1100ms ease' }}
            >
              <path
                d={leafOutline(leafLength, leafWidth)}
                fill={cord.color}
                fillOpacity={0.92}
                className="rvtree4-leaf"
                style={{ animationDelay: `${THREAD_DRAW_SECONDS}s` }}
              />
            </g>
          ))}

          {strands.map(({ slot, color, points }) => {
            const leafPoint = polar(slot.theta, slot.radius);
            const approach = points[points.length - 4] ?? leafPoint;
            const leafAngle =
              (Math.atan2(leafPoint.y - approach.y, leafPoint.x - approach.x) * 180) / Math.PI;
            const flip = Math.cos(slot.theta) < 0;
            const labelPoint = polar(slot.theta, slot.radius + labelGap);
            // Horizontal labels run straight out to the frame's edge from
            // wherever the leaf sits, so the room left is the distance to it.
            const roomPx = flip
              ? labelPoint.x - 18
              : VIEW_W - 18 - labelPoint.x;
            const maxNameChars = Math.max(
              12,
              Math.min(28, Math.floor(roomPx / (nameFontSize * 0.54))),
            );
            // The leaf and its name wait for their own branch to finish
            // arriving, so nothing ever buds on wood that is still growing.
            const fadeDelay = `${leafDelayFor(slot.slotIndex).toFixed(2)}s`;
            return (
              <g key={slot.person.id}>
                <g
                  transform={`translate(${leafPoint.x} ${leafPoint.y}) rotate(${leafAngle})`}
                  style={{ transition: 'transform 1100ms ease' }}
                >
                  <path
                    d={leafOutline(leafLength, leafWidth)}
                    fill={color}
                    fillOpacity={0.88}
                    className="rvtree4-leaf"
                    style={{ animationDelay: fadeDelay }}
                  />
                  <path
                    d={`M ${leafLength * 0.1} 0 L ${leafLength * 0.9} 0`}
                    stroke="#000000"
                    strokeOpacity={0.28}
                    strokeWidth={0.7}
                    className="rvtree4-leaf"
                    style={{ animationDelay: fadeDelay }}
                  />
                </g>
                <TapestryNameLabel
                  x={labelPoint.x}
                  y={labelY.get(slot.person.id) ?? labelPoint.y}
                  textAnchor={flip ? 'end' : 'start'}
                  fontSize={nameFontSize}
                  fill={color}
                  fadeDelay={fadeDelay}
                  name={truncateName(slot.person.name, maxNameChars)}
                  hovertext={slot.person.hovertext}
                />
              </g>
            );
          })}
        </g>

        <text
          x={CANOPY_X - 14}
          y={ROOT_Y + 76}
          textAnchor="end"
          className={playfair.className}
          fontSize={27}
          fontStyle="italic"
          fill={ELIZABETH_THREAD}
        >
          Elizabeth
        </text>
        <text
          x={CANOPY_X + 14}
          y={ROOT_Y + 76}
          textAnchor="start"
          className={playfair.className}
          fontSize={27}
          fontStyle="italic"
          fill={RAY_THREAD}
        >
          Raymond
        </text>
        <text
          x={CANOPY_X}
          y={ROOT_Y + 118}
          textAnchor="middle"
          className={cormorant.className}
          fontSize={17}
          fontStyle="italic"
          letterSpacing="0.14em"
          fill="#cbc4b3"
          opacity={0.8}
        >
          and everyone growing with us
        </text>
      </svg>
    </div>
  );
};

export default TreeV4Tapestry;
