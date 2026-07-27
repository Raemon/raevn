import { line, curveCatmullRom } from 'd3-shape';
import { playfair, cormorant } from '../handfasting-simple/save-the-date/handfastingInvitationTypography';
import { PAGE_BLACK, pickThreadColor, truncateName } from './tapestryPalette';
import { groupIntoFamilies, orderPersonsForTapestry } from './tapestryOrdering';
import { createSeededRandom } from './tapestrySeededRandom';
import type { TapestryEntrance, TapestryPerson } from './tapestryTypes';

// An oak grown out of a handfasting cord.
//
// Two cords — hers silver-blue, his wine — braid the whole length of the
// trunk, are bound tight with a few wraps at the foot, and fall away below as
// the loose ends. Out of that trunk spreads a real crown: boughs radiating at
// their own angles, each splitting into a twig per household, each household
// into a leaf per guest.
//
// The canopy is a radial fan, not two facing columns — boughs leave at
// scattered angles and lengths, so nothing lines up into a mirrored pair.
// Elizabeth's people fill the left sky, Ray's the right, and the friends the
// couple share sit at the top of the sweep, crowning the tree between them.
//
// Names are horizontal everywhere; nothing is set on an angle. A radial canopy
// puts far too many leaves at the same height to label each one in place, so
// the labels ride a halo just outside the crown: each side's names are dealt
// into evenly spaced bands, and each sits at the crown's own width for its
// band — so the block of names traces the outline of the tree, and a hair of a
// stem ties each name back to its leaf.
//
// Canopy geometry depends on the counts, so limbs carry a CSS `d` transition —
// each arrival gently re-grows the crown (browsers without `d` transitions
// just snap).
const VIEW_W = 1240;
const VIEW_BOX = '0 150 1240 1250';
const CANOPY_X = 620;
const CANOPY_Y = 660;

// The crown is an ellipse — taller than it is wide — so that horizontal names
// have somewhere to go. Ring radii step outward from these.
const RX_BASE = 168;
const RX_STEP = 52;
const RY_BASE = 214;
const RY_STEP = 74;
const SECTOR_START = (-196 * Math.PI) / 180;
const SECTOR_END = (16 * Math.PI) / 180;

// The halo the names ride, just outside the outermost ring.
const HALO_RX = RX_BASE + 3 * RX_STEP + 26;
const HALO_RY = RY_BASE + 3 * RY_STEP + 40;
const HALO_RX_MIN = 205;
const HALO_PAD = 15;
const BAND_TOP = 208;
const BAND_BOTTOM = 1000;
const BAND_MID = (BAND_TOP + BAND_BOTTOM) / 2;
const MAX_BAND_GAP = 34;

// The cord: braided the length of the trunk, bound at the foot, ends falling.
const TRUNK_BRAID_DX = 21;
const BIND_TOP = 986;
const BIND_BOTTOM = 1064;
const TAIL_END = 1214;

const BARK = '#9b7b4c';
const CORD_BIND = '#cbbfa4';
const ELIZABETH_INK = '#cdd9e9';
const RAY_INK = '#d9848f';
const EDGE_MARGIN = 16;
// Playfair runs a little over half its point size per mixed-case character.
const CHAR_WIDTH_RATIO = 0.55;
const REWEAVE_TRANSITION = 'd 900ms ease';

type Point = { x: number; y: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ellipse = (theta: number, rx: number, ry: number): Point => ({
  x: CANOPY_X + rx * Math.cos(theta),
  y: CANOPY_Y + ry * Math.sin(theta),
});

// The crown's own half-width at a given height — what makes the block of names
// bow out around the middle of the tree and draw back in at the top.
const haloRx = (y: number): number => {
  const t = (y - CANOPY_Y) / HALO_RY;
  return Math.max(HALO_RX_MIN, HALO_RX * Math.sqrt(Math.max(0, 1 - t * t)));
};

const smoothPath = line<Point>()
  .x((p) => p.x)
  .y((p) => p.y)
  .curve(curveCatmullRom.alpha(0.7));

const sampleQuadratic = (from: Point, control: Point, to: Point, samples = 22): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const u = 1 - t;
    points.push({
      x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
      y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
    });
  }
  return points;
};

// Real branches thin as they reach: three overlaid strokes of shrinking width
// over a shrinking prefix of the same curve fake a tapered limb.
const TaperedLimb = ({
  samples,
  baseWidth,
  tipWidth,
  color,
  drawDelaySeconds,
}: {
  samples: Point[];
  baseWidth: number;
  tipWidth: number;
  color: string;
  drawDelaySeconds: number;
}) => {
  const segments = [
    { points: samples, width: tipWidth },
    { points: samples.slice(0, Math.ceil(samples.length * 0.62)), width: lerp(tipWidth, baseWidth, 0.55) },
    { points: samples.slice(0, Math.ceil(samples.length * 0.34)), width: baseWidth },
  ];
  return (
    <>
      {segments.map((segment, index) => (
        <path
          key={index}
          d={smoothPath(segment.points) ?? ''}
          pathLength={1}
          className="rvknot-limb"
          style={{ animationDelay: `${drawDelaySeconds.toFixed(2)}s`, transition: REWEAVE_TRANSITION }}
          fill="none"
          stroke={color}
          strokeWidth={segment.width}
          strokeLinecap="round"
        />
      ))}
    </>
  );
};

type LeafSlot = {
  person: TapestryPerson;
  theta: number;
  rx: number;
  ry: number;
  ring: number;
  slotIndex: number;
};

const buildLeafSlots = (persons: TapestryPerson[]): LeafSlot[] => {
  const ordered = orderPersonsForTapestry(persons);
  const ringCount = ordered.length < 12 ? 1 : ordered.length < 26 ? 2 : ordered.length < 44 ? 3 : 4;
  return ordered.map((person, slotIndex) => {
    const random = createSeededRandom(`${person.id}::knot-leaf`);
    const theta = lerp(SECTOR_START, SECTOR_END, (slotIndex + 0.5) / ordered.length);
    // Neighbours in angle land on different rings, so the crown fills with
    // depth instead of a single rim of leaves.
    const ring = slotIndex % ringCount;
    return {
      person,
      theta,
      rx: RX_BASE + ring * RX_STEP + (random() - 0.5) * 16,
      ry: RY_BASE + ring * RY_STEP + (random() - 0.5) * 22,
      ring,
      slotIndex,
    };
  });
};

const leafPointOf = (slot: LeafSlot): Point => ellipse(slot.theta, slot.rx, slot.ry);

// One cord, end to end: braided down the trunk from under the crown, drawn in
// tight through the binding, then falling away as a loose end.
const founderCord = (sign: 1 | -1): Point[] => {
  const points: Point[] = [];
  // Starts above the highest bough, so every limb is seen leaving the cord.
  const braidTop = CANOPY_Y - 116;
  for (let i = 0; i <= 30; i++) {
    const y = lerp(braidTop, BIND_TOP, i / 30);
    points.push({
      x: CANOPY_X + sign * TRUNK_BRAID_DX * Math.sin((Math.PI * (y - braidTop)) / 152),
      y,
    });
  }
  for (let i = 1; i <= 6; i++) {
    points.push({ x: CANOPY_X + sign * 7, y: lerp(BIND_TOP, BIND_BOTTOM, i / 6) });
  }
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    const y = lerp(BIND_BOTTOM, TAIL_END, t);
    points.push({
      x: CANOPY_X + sign * (10 + 52 * t * t) + sign * 6 * Math.sin((Math.PI * y) / 88),
      y,
    });
  }
  return points;
};

const KnotTapestry = ({
  persons,
  entrance = 'staggered',
}: {
  persons: TapestryPerson[];
  entrance?: TapestryEntrance;
}) => {
  const limbDelay = (staggeredSeconds: number) =>
    entrance === 'staggered' ? staggeredSeconds : 0.1;
  const slots = buildLeafSlots(persons);
  const slotsById = new Map(slots.map((slot) => [slot.person.id, slot]));

  // Names are dealt into bands down each side of the crown. The denser side
  // sets the type size for both — two sizes facing each other reads as a
  // mistake.
  const sideCounts = { left: 0, right: 0 };
  for (const slot of slots) {
    if (Math.cos(slot.theta) < 0) sideCounts.left++;
    else sideCounts.right++;
  }
  const bandGapFor = (count: number) =>
    count <= 1 ? MAX_BAND_GAP : Math.min(MAX_BAND_GAP, (BAND_BOTTOM - BAND_TOP) / (count - 1));
  const tightestGap = Math.min(
    bandGapFor(Math.max(sideCounts.left, 1)),
    bandGapFor(Math.max(sideCounts.right, 1)),
  );
  const nameFontSize = Math.max(13, Math.min(18, tightestGap * 0.62));

  const labelByPersonId = new Map<
    string,
    { x: number; y: number; anchor: 'start' | 'end'; label: string }
  >();
  for (const side of ['left', 'right'] as const) {
    const dir = side === 'left' ? -1 : 1;
    // Ordered by the height of the leaf they belong to, so the stems fan out
    // to the halo without ever crossing one another.
    const sideSlots = slots
      .filter((slot) => (Math.cos(slot.theta) < 0 ? 'left' : 'right') === side)
      .sort((a, b) => leafPointOf(a).y - leafPointOf(b).y);
    const gap = bandGapFor(sideSlots.length);
    const blockTop = BAND_MID - (gap * Math.max(sideSlots.length - 1, 0)) / 2;
    sideSlots.forEach((slot, index) => {
      const y = blockTop + index * gap;
      const x = CANOPY_X + dir * (haloRx(y) + HALO_PAD);
      const room = dir < 0 ? x - EDGE_MARGIN : VIEW_W - EDGE_MARGIN - x;
      labelByPersonId.set(slot.person.id, {
        x,
        y,
        anchor: dir < 0 ? 'end' : 'start',
        label: truncateName(
          slot.person.name,
          Math.max(6, Math.floor(room / (nameFontSize * CHAR_WIDTH_RATIO))),
        ),
      });
    });
  }

  const families = groupIntoFamilies(persons).map((family) => {
    const memberSlots = family.members
      .map((member) => slotsById.get(member.id))
      .filter((slot): slot is LeafSlot => Boolean(slot));
    const meanTheta =
      memberSlots.reduce((sum, slot) => sum + slot.theta, 0) / Math.max(memberSlots.length, 1);
    const random = createSeededRandom(`${family.familyKey}::knot-family`);
    return {
      ...family,
      memberSlots,
      meanTheta,
      anchor: ellipse(
        meanTheta + (random() - 0.5) * 0.06,
        RX_BASE - 56 + (random() - 0.5) * 22,
        RY_BASE - 68 + (random() - 0.5) * 26,
      ),
    };
  });

  // Neighbouring families share a bough, so the canopy branches like a real
  // crown instead of a hub of spokes.
  const boughCount = Math.min(8, Math.max(3, Math.round(families.length / 4)));
  const familiesPerBough = Math.ceil(families.length / Math.max(boughCount, 1));
  const boughs = Array.from({ length: boughCount }, (_, boughIndex) => {
    const boughFamilies = families.slice(
      boughIndex * familiesPerBough,
      (boughIndex + 1) * familiesPerBough,
    );
    const meanTheta =
      boughFamilies.reduce((sum, family) => sum + family.meanTheta, 0) /
      Math.max(boughFamilies.length, 1);
    const random = createSeededRandom(`bough-${boughIndex}::knot`);
    // A bough leaves the trunk at its own height rather than from a shared
    // hub: the ones reaching sideways start low, the ones reaching for the sky
    // start high. That is the difference between a tree and a fountain.
    const sideways = Math.abs(Math.cos(meanTheta));
    const origin = {
      x: CANOPY_X + (random() - 0.5) * 16,
      y: CANOPY_Y - 96 + sideways * 210 + (random() - 0.5) * 30,
    };
    return {
      boughFamilies,
      origin,
      tip: ellipse(meanTheta, 84 + (random() - 0.5) * 26, 112 + (random() - 0.5) * 30),
      control: {
        x: lerp(origin.x, ellipse(meanTheta, 84, 112).x, 0.45) + (random() - 0.5) * 44,
        y: lerp(origin.y, ellipse(meanTheta, 84, 112).y, 0.55),
      },
    };
  }).filter((bough) => bough.boughFamilies.length > 0);

  return (
    <div className="relative mx-auto w-full max-w-3xl select-none" aria-label="Handfasting knot of confirmed guests">
      <style>{`
        .rvknot-limb {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: rvknotDraw 2.4s cubic-bezier(0.4, 0, 0.3, 1) forwards;
        }
        .rvknot-leaf {
          opacity: 0;
          animation: rvknotFade 1.3s ease forwards;
        }
        .rvknot-canopy {
          transform-origin: ${CANOPY_X}px ${CANOPY_Y}px;
          animation: rvknotSway 10s ease-in-out infinite alternate;
        }
        @keyframes rvknotDraw { to { stroke-dashoffset: 0; } }
        @keyframes rvknotFade { to { opacity: 1; } }
        @keyframes rvknotSway {
          from { transform: rotate(-0.3deg); }
          to { transform: rotate(0.3deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rvknot-limb { animation: none; stroke-dashoffset: 0; transition: none !important; }
          .rvknot-leaf { animation: none; opacity: 1; transition: none !important; }
          .rvknot-canopy { animation: none; }
        }
      `}</style>
      <svg viewBox={VIEW_BOX} className="h-auto w-full" role="img">
        <defs>
          <radialGradient id="rvknot-ground-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d9b26a" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#d9b26a" stopOpacity="0" />
          </radialGradient>
          <filter id="rvknot-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <ellipse cx={CANOPY_X} cy={BIND_BOTTOM} rx={280} ry={140} fill="url(#rvknot-ground-glow)" />

        {/* The two of us: cords braided the length of the trunk, bound at the
            foot, ends falling. Tied before the first RSVP — the tree stands
            even when nobody has answered yet. */}
        {([
          { sign: -1 as const, color: ELIZABETH_INK },
          { sign: 1 as const, color: RAY_INK },
        ]).map((cord) => (
          <g key={cord.sign}>
            <path
              d={smoothPath(founderCord(cord.sign)) ?? ''}
              pathLength={1}
              className="rvknot-limb"
              style={{ animationDelay: '0s' }}
              fill="none"
              stroke={PAGE_BLACK}
              strokeWidth={19}
              strokeLinecap="round"
            />
            <path
              d={smoothPath(founderCord(cord.sign)) ?? ''}
              pathLength={1}
              className="rvknot-limb"
              style={{ animationDelay: '0s' }}
              fill="none"
              stroke={cord.color}
              strokeWidth={10}
              strokeOpacity={0.97}
              strokeLinecap="round"
              filter="url(#rvknot-soft-glow)"
            />
          </g>
        ))}

        {/* The binding: a few tight wraps holding both cords together. */}
        {[0, 1, 2, 3].map((wrap) => {
          const y = lerp(BIND_TOP + 9, BIND_BOTTOM - 9, wrap / 3);
          const bow = wrap % 2 === 0 ? -7 : 7;
          return (
            <path
              key={wrap}
              d={
                smoothPath([
                  { x: CANOPY_X - 27, y: y + 5 },
                  { x: CANOPY_X, y: y + bow },
                  { x: CANOPY_X + 27, y: y + 5 },
                ]) ?? ''
              }
              pathLength={1}
              className="rvknot-limb"
              style={{ animationDelay: '0.15s' }}
              fill="none"
              stroke={CORD_BIND}
              strokeWidth={5.5}
              strokeOpacity={0.92}
              strokeLinecap="round"
            />
          );
        })}

        <g className="rvknot-canopy">
          {boughs.map((bough, boughIndex) => (
            <g key={boughIndex}>
              <TaperedLimb
                samples={sampleQuadratic(bough.origin, bough.control, bough.tip)}
                baseWidth={13}
                tipWidth={5.5}
                color={BARK}
                drawDelaySeconds={limbDelay(0.45)}
              />
              {bough.boughFamilies.map((family) => {
                const twigRandom = createSeededRandom(`${family.familyKey}::knot-twig`);
                const twigControl = {
                  x: lerp(bough.tip.x, family.anchor.x, 0.5) + (twigRandom() - 0.5) * 46,
                  y: lerp(bough.tip.y, family.anchor.y, 0.5) + (twigRandom() - 0.5) * 46,
                };
                return (
                  <g key={family.familyKey}>
                    <TaperedLimb
                      samples={sampleQuadratic(bough.tip, twigControl, family.anchor, 16)}
                      baseWidth={5}
                      tipWidth={2.2}
                      color={BARK}
                      drawDelaySeconds={limbDelay(0.95)}
                    />
                    {family.memberSlots.map((slot) => {
                      const leaf = leafPointOf(slot);
                      const placement = labelByPersonId.get(slot.person.id);
                      const stemRandom = createSeededRandom(`${slot.person.id}::knot-stem`);
                      const stemControl = {
                        x: lerp(family.anchor.x, leaf.x, 0.5) + (stemRandom() - 0.5) * 34,
                        y: lerp(family.anchor.y, leaf.y, 0.5) + (stemRandom() - 0.5) * 34,
                      };
                      const color = pickThreadColor(slot.person.side, slot.person.id);
                      const fadeDelay = `${(entrance === 'staggered'
                        ? 1.25 + slot.slotIndex * 0.016
                        : 0.35
                      ).toFixed(2)}s`;
                      const thetaDeg = (slot.theta * 180) / Math.PI;
                      return (
                        <g key={slot.person.id}>
                          <path
                            d={smoothPath(sampleQuadratic(family.anchor, stemControl, leaf, 14)) ?? ''}
                            pathLength={1}
                            className="rvknot-limb"
                            style={{ animationDelay: `${limbDelay(1.15)}s`, transition: REWEAVE_TRANSITION }}
                            fill="none"
                            stroke={BARK}
                            strokeWidth={1.4}
                            strokeOpacity={0.8}
                            strokeLinecap="round"
                          />
                          {/* A hair of a stem out to the halo, so a name on the
                              rim still reads as belonging to its leaf. */}
                          {placement && (
                            <path
                              d={
                                smoothPath([
                                  leaf,
                                  {
                                    x: lerp(leaf.x, placement.x, 0.55),
                                    y: lerp(leaf.y, placement.y, 0.72),
                                  },
                                  {
                                    x: placement.anchor === 'end' ? placement.x + 5 : placement.x - 5,
                                    y: placement.y,
                                  },
                                ]) ?? ''
                              }
                              pathLength={1}
                              className="rvknot-limb"
                              style={{ animationDelay: `${limbDelay(1.15)}s`, transition: REWEAVE_TRANSITION }}
                              fill="none"
                              stroke={color}
                              strokeWidth={0.85}
                              strokeOpacity={0.34}
                              strokeLinecap="round"
                            />
                          )}
                          <ellipse
                            rx={7.5}
                            ry={3.4}
                            transform={`translate(${leaf.x} ${leaf.y}) rotate(${thetaDeg + 38})`}
                            fill={color}
                            className="rvknot-leaf"
                            style={{ animationDelay: fadeDelay, transition: 'transform 900ms ease' }}
                            opacity={0.95}
                          />
                          {placement && (
                            <text
                              x={placement.x}
                              y={placement.y}
                              textAnchor={placement.anchor}
                              dominantBaseline="middle"
                              className={`${playfair.className} rvknot-leaf`}
                              style={{
                                animationDelay: fadeDelay,
                                transition: 'x 900ms ease, y 900ms ease, font-size 900ms ease',
                              }}
                              fontSize={nameFontSize}
                              fill={color}
                            >
                              {slot.person.hovertext ? <title>{slot.person.hovertext}</title> : null}
                              {placement.label}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          ))}
        </g>

        <text
          x={CANOPY_X - 96}
          y={TAIL_END + 66}
          textAnchor="end"
          className={playfair.className}
          fontSize={27}
          fontStyle="italic"
          fill={ELIZABETH_INK}
          filter="url(#rvknot-soft-glow)"
        >
          Elizabeth
        </text>
        <text
          x={CANOPY_X}
          y={TAIL_END + 66}
          textAnchor="middle"
          className={playfair.className}
          fontSize={22}
          fontStyle="italic"
          fill="#cbc4b3"
          opacity={0.85}
        >
          &amp;
        </text>
        <text
          x={CANOPY_X + 96}
          y={TAIL_END + 66}
          textAnchor="start"
          className={playfair.className}
          fontSize={27}
          fontStyle="italic"
          fill={RAY_INK}
          filter="url(#rvknot-soft-glow)"
        >
          Ray
        </text>
        <text
          x={CANOPY_X}
          y={TAIL_END + 110}
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

export default KnotTapestry;
