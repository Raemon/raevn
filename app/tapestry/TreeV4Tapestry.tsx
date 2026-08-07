import { line, curveCatmullRom } from 'd3-shape';
import { playfair, cormorant } from '../handfasting-simple/save-the-date/handfastingInvitationTypography';
import {
  cordRootColorFor,
  cordTipColorFor,
  leafFillColorFor,
  spectrumColorAt,
  spectrumStrandEdgeAt,
  spectrumStrandMidAt,
  truncateName,
} from './tapestryPalette';
import { orderPersonsForTapestry } from './tapestryOrdering';
import { createSeededRandom } from './tapestrySeededRandom';
import {
  arcProgressTable,
  braidSwingEnvelope,
  braidTurnAt,
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
import {
  BRAID,
  CURVE,
  FRAME,
  GROWTH,
  LABELS,
  LEAVES,
  MOTION,
  PALETTE,
  ROOTS,
  SIGNATURE,
  THREADS,
  type GrowthRange,
} from './treeTuning';
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
//
// Every number that shapes any of this lives in treeTuning.ts. This file only
// says how the numbers are used, so tuning the drawing never means reading it.

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

// Local aliases for the handful of frame figures used on nearly every line.
const CANOPY_X = FRAME.canopyX;
const ROOT_Y = FRAME.rootY;
const VIEW_W = FRAME.width;
const VIEW_BOTTOM = ROOT_Y + FRAME.bottomMargin;
const SECTOR_START = rad(FRAME.sectorStartDeg);
const SECTOR_END = rad(FRAME.sectorEndDeg);
const REWEAVE_TRANSITION = `d ${MOTION.reweaveMs}ms ease`;

const smoothPath = line<Vec>()
  .x((p) => p.x)
  .y((p) => p.y)
  .curve(curveCatmullRom.alpha(CURVE.tension));

// An embroidered leaf: two arcs meeting at the tip, with a single stitch laid
// down the middle for the vein.
const leafOutline = (length: number, width: number) => {
  const belly = length * LEAVES.bellyAlong;
  return `M 0 0 Q ${belly} ${-width} ${length} 0 Q ${belly} ${width} 0 0 Z`;
};

const TreeV4Tapestry = ({
  persons,
  entrance = 'staggered',
  celebratePersonId,
}: {
  persons: TapestryPerson[];
  entrance?: TapestryEntrance;
  // When set, that person's strand draws on the fast 'single' clock and their
  // diagram hovertext opens without waiting for a cursor.
  celebratePersonId?: string | null;
}) => {
  const isSingleEntrance = entrance === 'single';
  const threadDrawSeconds = isSingleEntrance
    ? MOTION.singleThreadDrawSeconds
    : MOTION.threadDrawSeconds;
  const leafFadeSeconds = isSingleEntrance ? MOTION.singleLeafFadeSeconds : MOTION.leafFadeSeconds;
  // When a branch starts drawing, and when the leaf on the end of it is allowed
  // to appear — always one full draw later, so the leaf lands on finished wood.
  const threadDelayFor = (slotIndex: number) =>
    entrance === 'staggered'
      ? MOTION.staggerStartSeconds + slotIndex * MOTION.staggerPerSlotSeconds
      : MOTION.singleDelaySeconds;
  const leafDelayFor = (slotIndex: number) => threadDelayFor(slotIndex) + threadDrawSeconds;

  const growth = 1 - Math.exp(-persons.length / GROWTH.saturation);
  // Everything the tree grows into is one interpolation along that curve.
  const grown = (range: GrowthRange) => lerp(range.seedling, range.mature, growth);

  const trunkHeight = grown(GROWTH.trunkHeight);
  const ringBase = grown(GROWTH.ringBase);
  const ringStep = grown(GROWTH.ringStep);
  const canopyY = ROOT_Y - trunkHeight;

  const polar = (theta: number, radius: number): Vec => ({
    x: CANOPY_X + radius * Math.cos(theta),
    y: canopyY + radius * Math.sin(theta) * FRAME.crownSquash,
  });

  const ordered = orderPersonsForTapestry(persons);
  const ringCount =
    GROWTH.ringCountBreaks.filter((breakAt) => ordered.length >= breakAt).length + 1;
  const slots: StrandSlot[] = ordered.map((person, slotIndex) => {
    const random = createSeededRandom(`${person.id}::tree4-leaf`);
    const theta = lerp(SECTOR_START, SECTOR_END, (slotIndex + 0.5) / ordered.length);
    const ring = slotIndex % ringCount;
    const radius =
      (ringCount === 1 ? ringBase + GROWTH.singleRingBonus * growth : ringBase) +
      ring * ringStep +
      (random() - 0.5) * GROWTH.ringJitter * growth;
    return { person, slotIndex, theta, radius };
  });

  const crownReach = slots.reduce((widest, slot) => Math.max(widest, slot.radius), 0);
  const leafLength = grown(LEAVES.length);
  const leafWidth = leafLength * LEAVES.widthRatio;
  const labelGap = leafLength + LEAVES.labelGap;

  const rootDrop = trunkHeight * grown(ROOTS.drop);
  const rootSpread = trunkHeight * grown(ROOTS.spread);
  const elizabethRoot: Vec = { x: CANOPY_X - rootSpread, y: ROOT_Y + rootDrop };
  const raymondRoot: Vec = { x: CANOPY_X + rootSpread, y: ROOT_Y + rootDrop };
  const collar: Vec = { x: CANOPY_X, y: ROOT_Y - trunkHeight * ROOTS.collarRise };
  const trunkTop: StrandAnchor = { point: { x: CANOPY_X, y: canopyY }, load: slots.length };

  const rootPrefixById = new Map<string, StrandAnchor[]>();
  slots.forEach((slot) => {
    const sideCount = slots.filter(
      (other) => Math.abs(other.person.sideBlend - slot.person.sideBlend) < 0.34,
    ).length;
    const tip: Vec = {
      x: lerp(raymondRoot.x, elizabethRoot.x, slot.person.sideBlend),
      y: lerp(raymondRoot.y, elizabethRoot.y, slot.person.sideBlend),
    };
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
      points: anchors
        ? buildStrandPath(anchors, {
            threadSpacing: THREADS.spacing,
            twistTurns: THREADS.twistTurns,
            phase,
            beta: THREADS.beta,
          })
        : [],
    };
  });

  const arcGapPx =
    ((SECTOR_END - SECTOR_START) / Math.max(slots.length, 1)) * ringCount * ringBase;
  const nameFontSize = Math.max(
    LABELS.minFontSize,
    Math.min(LABELS.maxFontSize, arcGapPx * LABELS.fontSizeFromGap),
  );

  // Names lie flat, so two leaves at the same height on the same side of the
  // crown collide however far apart their branches are. Walk each side top to
  // bottom and stack the labels — never the leaves — clear of the ones already
  // placed.
  const lineHeight = nameFontSize * LABELS.lineHeightRatio;
  const maxLabelDrift = nameFontSize * LABELS.maxDriftLines;
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
          width: slot.person.name.length * nameFontSize * LABELS.charWidthRatio,
        };
      })
      .filter((row) => row.onLeft === (side === 'left'))
      .sort((a, b) => a.y - b.y);

    const placed: typeof rows = [];
    for (const row of rows) {
      let wantedY = row.y;
      for (let i = Math.max(0, placed.length - LABELS.neighboursChecked); i < placed.length; i++) {
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

  // Where each name sits and how much of it fits — shared by the render below
  // and by the phone framing, which needs to know how wide the tree really is.
  const labelLayout = new Map(
    slots.map((slot) => {
      const labelPoint = polar(slot.theta, slot.radius + labelGap);
      const flip = Math.cos(slot.theta) < 0;
      // Horizontal labels run straight out to the frame's edge from
      // wherever the leaf sits, so the room left is the distance to it.
      const roomPx = flip
        ? labelPoint.x - LABELS.edgeMargin
        : VIEW_W - LABELS.edgeMargin - labelPoint.x;
      const maxNameChars = Math.max(
        LABELS.minChars,
        Math.min(
          LABELS.maxChars,
          Math.floor(roomPx / (nameFontSize * LABELS.truncateCharWidthRatio)),
        ),
      );
      const shownName = truncateName(slot.person.name, maxNameChars);
      const nameWidth = shownName.length * nameFontSize * LABELS.truncateCharWidthRatio;
      return [
        slot.person.id,
        { labelPoint, flip, shownName, outerX: flip ? labelPoint.x - nameWidth : labelPoint.x + nameWidth },
      ] as const;
    }),
  );

  // The couple's own two cords. Each one arcs up out of its owner's root
  // cluster — the same tip their own people's threads spring from, so the cord
  // reads as the thick parent root of that fan — meets the other at the collar,
  // braids around it up the trunk, and then parts ways at the trunk top,
  // sweeping into its owner's half of the crown to thin away among their people.
  const cordPeakHalfWidth = grown(BRAID.peakHalfWidth);
  const cordHalfWidthAt = (progress: number) =>
    cordPeakHalfWidth *
    (progress < BRAID.swingStart
      ? Math.pow(progress / BRAID.swingStart, BRAID.taperInExponent)
      : progress <= BRAID.swingEnd
        ? 1
        : Math.pow(
            Math.max(0, 1 - (progress - BRAID.swingEnd) / (1 - BRAID.swingEnd)),
            BRAID.taperOutExponent,
          ));
  // The swing is dead level across the whole window, so every lobe opens exactly
  // as wide as the last; braidTurnAt is already zero at both window edges, so a
  // flat amplitude still opens and closes the braid smoothly, and the easing at
  // the edges only rounds off the sample right at the switch. How wide is set
  // by how tall — see BRAID.lobeAspect.
  const cordSwingRadiusFor = (windowLength: number) =>
    ((windowLength / BRAID.lobes) * BRAID.lobeAspect) / 2;

  const coupleCords = (
    [
      {
        key: 'elizabeth',
        color: PALETTE.elizabeth,
        root: elizabethRoot,
        sweep: BRAID.elizabethSweepDeg,
        phase: 0,
      },
      {
        key: 'raymond',
        color: PALETTE.raymond,
        root: raymondRoot,
        sweep: BRAID.raymondSweepDeg,
        phase: Math.PI,
      },
    ] as const
  ).map((cord) => {
    const reach = Math.max(crownReach, trunkHeight * BRAID.minReachInTrunks);
    const cordAnchors = [
      { point: cord.root, load: 1 },
      { point: collar, load: 1 },
      { point: trunkTop.point, load: 1 },
      // Halfway between straight up and the direction it finally sweeps.
      { point: polar(rad((cord.sweep - 90) / 2), reach * BRAID.midKnotReach), load: 1 },
      { point: polar(rad(cord.sweep), reach * BRAID.tipKnotReach), load: 1 },
    ];
    // How far along the cord each sample actually *is*, as opposed to how far
    // through the knot chain it is. The braid is laid out in these terms so its
    // lobes come out the same height as one another.
    const { arcProgress, totalLength } = arcProgressTable(cordAnchors, BRAID.beta, BRAID.samples);
    const arcAt = (progress: number) => {
      const scaled = Math.min(1, Math.max(0, progress)) * (arcProgress.length - 1);
      const index = Math.min(Math.floor(scaled), arcProgress.length - 2);
      return lerp(arcProgress[index], arcProgress[index + 1], scaled - index);
    };
    const windowStartArc = arcAt(BRAID.swingStart);
    const windowArcSpan = Math.max(arcAt(BRAID.swingEnd) - windowStartArc, 1e-6);
    const cordSwingRadius = cordSwingRadiusFor(windowArcSpan * totalLength);
    // 0 where the braid opens at the collar, 1 where it closes at the trunk top,
    // measured in distance travelled rather than knots passed.
    const windowArcAt = (progress: number) =>
      Math.min(1, Math.max(0, (arcAt(progress) - windowStartArc) / windowArcSpan));
    const woven = buildWovenStrand(cordAnchors, {
      threadSpacing: THREADS.spacing,
      // Unused for the cords — `turnAt` drives the winding instead.
      twistTurns: 0,
      phase: cord.phase,
      beta: BRAID.beta,
      amplitudeAt: (progress: number) =>
        cordSwingRadius * braidSwingEnvelope(windowArcAt(progress), BRAID.swingEase),
      turnAt: (progress: number) =>
        braidTurnAt(
          windowArcAt(progress),
          BRAID.lobes,
          cord.phase,
          BRAID.lobeRoundness,
          BRAID.interlaceHarmonic,
        ),
      samples: BRAID.samples,
    });
    const centreline = woven.points;
    const lastIndex = centreline.length - 1;
    const tip = centreline[lastIndex];
    const approach = centreline[Math.max(lastIndex - BRAID.tipAngleLookback, 0)];
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

  // Cut the top of the frame to whatever is actually up there: the highest name,
  // or — before anyone has replied — the tip of the couple's own two cords.
  // Everything below the ground line is fixed, so only this edge moves, and as
  // the crown climbs the frame climbs with it.
  const contentTopY = Math.min(
    ...coupleCords.map((cord) => cord.tip.y - leafLength),
    ...slots.map((slot) =>
      Math.min(labelY.get(slot.person.id) ?? Infinity, polar(slot.theta, slot.radius).y),
    ),
  );
  const viewTop = contentTopY - nameFontSize * FRAME.topMarginLines;
  const viewBox = `0 ${viewTop} ${VIEW_W} ${VIEW_BOTTOM - viewTop}`;

  // The phone framing: how much wider the frame is than what actually needs
  // showing — the farthest-reaching name or cord tip, or the signature floor.
  // On screens narrower than FRAME.phoneMaxWidthPx the drawing is rendered this
  // many times the screen's width and centred, so the tree itself spans the
  // screen and only the frame's blank sides fall away.
  const contentHalfWidth = Math.max(
    ...slots.map((slot) => Math.abs((labelLayout.get(slot.person.id)?.outerX ?? CANOPY_X) - CANOPY_X)),
    ...coupleCords.map((cord) => Math.abs(cord.tip.x - CANOPY_X) + leafLength),
    rootSpread,
  );
  const visibleHalfWidth = Math.min(
    VIEW_W / 2,
    Math.max(FRAME.phoneMinHalfWidth, contentHalfWidth + FRAME.phoneSideMargin),
  );
  const phoneOverscan = VIEW_W / (2 * visibleHalfWidth);

  const glowRadius = Math.max(
    crownReach * PALETTE.groundGlowFromCrown,
    trunkHeight * PALETTE.groundGlowFromTrunk,
  );
  const spectrumHalfSpan = Math.max(crownReach, rootSpread, VIEW_W * 0.38);

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
          </g>
        )),
    );

  return (
    <div
      className="relative mx-auto flex w-full max-w-none justify-center overflow-hidden select-none"
      aria-label="Tree of confirmed guests"
    >
      <style>{`
        @media (max-width: ${FRAME.phoneMaxWidthPx}px) {
          .rvtree4-svg { width: ${(phoneOverscan * 100).toFixed(1)}%; max-width: none; flex: none; }
        }
        .rvtree4-thread {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: rvtree4Draw ${threadDrawSeconds}s ${MOTION.drawEasing} forwards;
        }
        .rvtree4-cord {
          opacity: 0;
          animation: rvtree4Fade ${threadDrawSeconds}s ease forwards;
        }
        .rvtree4-leaf {
          opacity: 0;
          animation: rvtree4Fade ${leafFadeSeconds}s ease forwards;
        }
        .rvtree4-tree {
          transform-origin: ${CANOPY_X}px ${ROOT_Y}px;
          animation: rvtree4Sway ${MOTION.swaySeconds}s ease-in-out infinite alternate;
        }
        @keyframes rvtree4Draw { to { stroke-dashoffset: 0; } }
        @keyframes rvtree4Fade { to { opacity: 1; } }
        @keyframes rvtree4Sway {
          from { transform: rotate(${-MOTION.swayDegrees}deg); }
          to { transform: rotate(${MOTION.swayDegrees}deg); }
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
        className="rvtree4-svg mx-auto block h-auto w-full"
        style={{ maxHeight: `${FRAME.maxHeightVh}vh` }}
        role="img"
      >
        <defs>
          <radialGradient id="rvtree4-ground-glow" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={PALETTE.groundGlow}
              stopOpacity={PALETTE.groundGlowOpacity}
            />
            <stop offset="100%" stopColor={PALETTE.groundGlow} stopOpacity="0" />
          </radialGradient>
          {strands.map(({ slot, points }) => {
            if (points.length === 0) return null;
            // One hue for the whole strand, taken from where its own leaf ends
            // up. Reading the colour off each end separately meant a thread
            // spent its root and trunk in the silver centre — every strand
            // starts at a root cluster near the trunk — and only found its
            // side's colour in the last stretch out to the leaf.
            const tip = points[points.length - 1];
            return (
              <linearGradient
                key={slot.person.id}
                id={`rvtree4-thread-${slot.slotIndex}`}
                gradientUnits="userSpaceOnUse"
                x1={points[0].x}
                y1={points[0].y}
                x2={tip.x}
                y2={tip.y}
              >
                <stop
                  offset="0%"
                  stopColor={spectrumStrandEdgeAt(tip.x, CANOPY_X, spectrumHalfSpan, 'root')}
                />
                <stop
                  offset="50%"
                  stopColor={spectrumStrandMidAt(tip.x, CANOPY_X, spectrumHalfSpan)}
                />
                <stop
                  offset="100%"
                  stopColor={spectrumStrandEdgeAt(tip.x, CANOPY_X, spectrumHalfSpan, 'tip')}
                />
              </linearGradient>
            );
          })}
          {coupleCords.map((cord) => (
            <linearGradient
              key={cord.key}
              id={`rvtree4-cord-${cord.key}`}
              gradientUnits="userSpaceOnUse"
              x1={cord.root.x}
              y1={cord.root.y}
              x2={cord.tip.x}
              y2={cord.tip.y}
            >
              <stop offset="0%" stopColor={cordRootColorFor(cord.color)} />
              <stop offset={`${PALETTE.cordFullStop * 100}%`} stopColor={cord.color} />
              <stop offset="100%" stopColor={cordTipColorFor(cord.color)} />
            </linearGradient>
          ))}
        </defs>

        <ellipse
          cx={CANOPY_X}
          cy={ROOT_Y + PALETTE.groundGlowDrop}
          rx={glowRadius}
          ry={glowRadius * PALETTE.groundGlowFlatten}
          fill="url(#rvtree4-ground-glow)"
          style={{ transition: `rx ${MOTION.reweaveMs}ms ease, ry ${MOTION.reweaveMs}ms ease` }}
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
                strokeWidth={THREADS.width}
                strokeLinecap="round"
                strokeOpacity={THREADS.opacity}
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
              style={{ transition: `transform ${MOTION.reweaveMs}ms ease` }}
            >
              <path
                d={leafOutline(leafLength, leafWidth)}
                fill={leafFillColorFor(cord.color)}
                fillOpacity={LEAVES.coupleFillOpacity}
                className="rvtree4-leaf"
                style={{ animationDelay: `${threadDrawSeconds}s` }}
              />
            </g>
          ))}

          {strands.map(({ slot, points }) => {
            const leafPoint = polar(slot.theta, slot.radius);
            const nameColor = spectrumColorAt(leafPoint.x, CANOPY_X, spectrumHalfSpan);
            const approach = points[points.length - LEAVES.angleLookback] ?? leafPoint;
            const leafAngle =
              (Math.atan2(leafPoint.y - approach.y, leafPoint.x - approach.x) * 180) / Math.PI;
            const { labelPoint, flip, shownName } = labelLayout.get(slot.person.id)!;
            // The leaf and its name wait for their own branch to finish
            // arriving, so nothing ever buds on wood that is still growing.
            const fadeDelay = `${leafDelayFor(slot.slotIndex).toFixed(2)}s`;
            return (
              <g key={slot.person.id}>
                <g
                  transform={`translate(${leafPoint.x} ${leafPoint.y}) rotate(${leafAngle})`}
                  style={{ transition: `transform ${MOTION.reweaveMs}ms ease` }}
                >
                  <path
                    d={leafOutline(leafLength, leafWidth)}
                    fill={leafFillColorFor(nameColor)}
                    fillOpacity={LEAVES.fillOpacity}
                    className="rvtree4-leaf"
                    style={{ animationDelay: fadeDelay }}
                  />
                  <path
                    d={`M ${leafLength * LEAVES.veinFrom} 0 L ${leafLength * LEAVES.veinTo} 0`}
                    stroke={LEAVES.veinColor}
                    strokeOpacity={LEAVES.veinOpacity}
                    strokeWidth={LEAVES.veinWidth}
                    className="rvtree4-leaf"
                    style={{ animationDelay: fadeDelay }}
                  />
                </g>
                <TapestryNameLabel
                  x={labelPoint.x}
                  y={labelY.get(slot.person.id) ?? labelPoint.y}
                  textAnchor={flip ? 'end' : 'start'}
                  fontSize={nameFontSize}
                  fill={nameColor}
                  fadeDelay={fadeDelay}
                  name={shownName}
                  hovertext={slot.person.hovertext}
                  forceTooltipOpen={slot.person.id === celebratePersonId && !!slot.person.hovertext}
                />
              </g>
            );
          })}
        </g>

        <text
          x={CANOPY_X - SIGNATURE.xGap}
          y={ROOT_Y + SIGNATURE.yDrop}
          textAnchor="end"
          className={playfair.className}
          fontSize={SIGNATURE.fontSize}
          fontStyle="italic"
          fill={PALETTE.elizabeth}
        >
          Elizabeth
        </text>
        <text
          x={CANOPY_X + SIGNATURE.xGap}
          y={ROOT_Y + SIGNATURE.yDrop}
          textAnchor="start"
          className={playfair.className}
          fontSize={SIGNATURE.fontSize}
          fontStyle="italic"
          fill={PALETTE.raymond}
        >
          Raymond
        </text>
        <text
          x={CANOPY_X}
          y={ROOT_Y + SIGNATURE.taglineDrop}
          textAnchor="middle"
          className={cormorant.className}
          fontSize={SIGNATURE.taglineFontSize}
          fontStyle="italic"
          letterSpacing={SIGNATURE.taglineLetterSpacing}
          fill={SIGNATURE.taglineColor}
          opacity={SIGNATURE.taglineOpacity}
        >
          and everyone growing with us
        </text>
      </svg>
    </div>
  );
};

export default TreeV4Tapestry;
