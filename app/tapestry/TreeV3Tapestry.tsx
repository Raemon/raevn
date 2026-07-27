import { line, curveCatmullRom } from 'd3-shape';
import { playfair, cormorant } from '../handfasting-simple/save-the-date/handfastingInvitationTypography';
import { pickThreadColor, truncateName } from './tapestryPalette';
import { groupIntoFamilies, orderPersonsForTapestry } from './tapestryOrdering';
import { createSeededRandom } from './tapestrySeededRandom';
import type { TapestryEntrance, TapestryPerson } from './tapestryTypes';

// A tree grown from two intertwined trunks — silver and gold strands braiding
// up from the roots, the couple's names at the base. The canopy is the guest
// list: each household is a twig off a shared bough, each person a leaf with
// their name radiating outward. Elizabeth's people fill the left sky, Ray's
// the right, shared friends the crown between.

// Wide enough that even the outermost horizontal names have room to finish:
// the crown itself only spans the middle 950 units.
const VIEW_W = 1400;
const CANOPY_X = 700;
const CANOPY_Y = 855;
// A short trunk: enough braid to read as two strands twining, no more. The
// canopy is the point, so the tree sits low on its own stem.
const ROOT_Y = 1015;
const TRUNK_HEIGHT = ROOT_Y - CANOPY_Y;
// Two crossings between root and crown, whatever the trunk's height.
const BRAID_PERIOD = TRUNK_HEIGHT / 1.97;
// Vertically cropped to the tree itself: the canopy's farthest label reaches
// y≈239, the root inscription ends a hundred-odd units below the roots.
const VIEW_TOP = 225;
const VIEW_BOTTOM = ROOT_Y + 118;
const VIEW_BOX = `0 ${VIEW_TOP} ${VIEW_W} ${VIEW_BOTTOM - VIEW_TOP}`;
const SECTOR_START = (-197 * Math.PI) / 180;
const SECTOR_END = (17 * Math.PI) / 180;
const RING_BASE = 280;
const RING_STEP = 92;
const BARK = '#9b7b4c';
const BARK_DEEP = '#77592f';
// Limbs lose both light and colour as they reach: the outermost twigs are a
// dusty grey-brown so the guests' names are what glows at the edge.
const BARK_TIP = '#5b5245';
// Canopy geometry depends on the guest count, so limbs and leaves carry CSS
// transitions — each new arrival makes the whole crown gently re-arrange.
const REWEAVE_TRANSITION = 'd 900ms ease';

type Point = { x: number; y: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const polar = (theta: number, radius: number): Point => ({
  x: CANOPY_X + radius * Math.cos(theta),
  y: CANOPY_Y + radius * Math.sin(theta),
});
const mixHex = (from: string, to: string, t: number) => {
  const channel = (hex: string, offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  const blended = [1, 3, 5].map((offset) =>
    Math.round(lerp(channel(from, offset), channel(to, offset), t))
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${blended.join('')}`;
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

// Real branches thin as they reach: three overlaid strokes of shrinking
// width over a shrinking prefix of the same curve fake a tapered limb. All
// three share one gradient laid along the limb in user space, so the wood
// dims and greys towards the tip without the widths banding it into stripes.
const TaperedLimb = ({
  samples,
  baseWidth,
  tipWidth,
  color,
  tipColor = BARK_TIP,
  gradientKey,
  drawDelaySeconds,
}: {
  samples: Point[];
  baseWidth: number;
  tipWidth: number;
  color: string;
  tipColor?: string;
  gradientKey: string;
  drawDelaySeconds: number;
}) => {
  const gradientId = `rvtree3-bark-${gradientKey.replace(/[^a-zA-Z0-9]+/g, '-')}`;
  const from = samples[0];
  const to = samples[samples.length - 1];
  const segments = [
    { points: samples, width: tipWidth },
    { points: samples.slice(0, Math.ceil(samples.length * 0.62)), width: lerp(tipWidth, baseWidth, 0.55) },
    { points: samples.slice(0, Math.ceil(samples.length * 0.34)), width: baseWidth },
  ];
  return (
    <>
      <linearGradient
        id={gradientId}
        gradientUnits="userSpaceOnUse"
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
      >
        <stop offset="0%" stopColor={color} />
        <stop offset="45%" stopColor={mixHex(color, tipColor, 0.4)} />
        <stop offset="100%" stopColor={tipColor} />
      </linearGradient>
      {segments.map((segment, index) => (
        <path
          key={index}
          d={smoothPath(segment.points) ?? ''}
          pathLength={1}
          className="rvtree3-limb"
          style={{ animationDelay: `${drawDelaySeconds.toFixed(2)}s`, transition: REWEAVE_TRANSITION }}
          fill="none"
          stroke={`url(#${gradientId})`}
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
  radius: number;
  slotIndex: number;
};

const buildLeafSlots = (persons: TapestryPerson[]): LeafSlot[] => {
  const ordered = orderPersonsForTapestry(persons);
  const ringCount = ordered.length < 14 ? 1 : ordered.length < 32 ? 2 : 3;
  return ordered.map((person, slotIndex) => {
    const random = createSeededRandom(`${person.id}::tree-leaf`);
    const theta = lerp(SECTOR_START, SECTOR_END, (slotIndex + 0.5) / ordered.length);
    const ring = slotIndex % ringCount;
    const radius =
      (ringCount === 1 ? RING_BASE + 45 : RING_BASE) + ring * RING_STEP + (random() - 0.5) * 20;
    return { person, theta, radius, slotIndex };
  });
};

const TreeV3Tapestry = ({
  persons,
  entrance = 'staggered',
}: {
  persons: TapestryPerson[];
  entrance?: TapestryEntrance;
}) => {
  // With no RSVPs yet the tree still stands: the braided trunk, the roots,
  // and the couple's names — a canopy waiting to fill.
  const limbDelay = (staggeredSeconds: number) =>
    entrance === 'staggered' ? staggeredSeconds : 0.1;
  const slots = buildLeafSlots(persons);
  const slotsById = new Map(slots.map((slot) => [slot.person.id, slot]));
  const families = groupIntoFamilies(persons).map((family) => {
    const memberSlots = family.members
      .map((member) => slotsById.get(member.id))
      .filter((slot): slot is LeafSlot => Boolean(slot));
    const meanTheta =
      memberSlots.reduce((sum, slot) => sum + slot.theta, 0) / Math.max(memberSlots.length, 1);
    const anchorRandom = createSeededRandom(`${family.familyKey}::tree-family`);
    return {
      ...family,
      memberSlots,
      anchor: polar(meanTheta + (anchorRandom() - 0.5) * 0.05, RING_BASE - 88 + (anchorRandom() - 0.5) * 26),
      meanTheta,
    };
  });

  // Neighbouring families share a bough, so the canopy branches like a real
  // crown instead of a hub of spokes.
  const boughCount = Math.min(8, Math.max(3, Math.round(families.length / 4)));
  const familiesPerBough = Math.ceil(families.length / boughCount);
  const boughs = Array.from({ length: boughCount }, (_, boughIndex) => {
    const boughFamilies = families.slice(
      boughIndex * familiesPerBough,
      (boughIndex + 1) * familiesPerBough,
    );
    const meanTheta =
      boughFamilies.reduce((sum, family) => sum + family.meanTheta, 0) /
      Math.max(boughFamilies.length, 1);
    const random = createSeededRandom(`bough-${boughIndex}::tree`);
    return {
      boughFamilies,
      tip: polar(meanTheta, 128 + (random() - 0.5) * 24),
      control: polar(meanTheta + (random() - 0.5) * 0.5, 58),
    };
  }).filter((bough) => bough.boughFamilies.length > 0);

  const arcGapPx =
    ((SECTOR_END - SECTOR_START) / slots.length) *
    (slots.length < 14 ? 1 : slots.length < 32 ? 2 : 3) *
    RING_BASE;
  const nameFontSize = Math.max(13, Math.min(17, arcGapPx * 0.46));

  // Names lie flat, so two leaves at the same height on the same side of the
  // crown overlap however far apart their branches are. Nudge the labels —
  // never the leaves — down until each side's names clear one another, by no
  // more than a line, so every name still reads against its own leaf.
  const labelY = new Map<string, number>();
  const labelNudgeLimit = nameFontSize;
  (['left', 'right'] as const).forEach((side) => {
    const rows = slots
      .map((slot) => {
        const point = polar(slot.theta, slot.radius + 17);
        return {
          id: slot.person.id,
          onLeft: Math.cos(slot.theta) < 0,
          x: point.x,
          y: point.y,
          width: slot.person.name.length * nameFontSize * 0.5,
        };
      })
      .filter((row) => row.onLeft === (side === 'left'))
      .sort((a, b) => a.y - b.y);
    rows.forEach((row, index) => {
      const above = rows[index - 1];
      const overlapsHorizontally =
        above &&
        (side === 'left'
          ? Math.min(above.x, row.x) > Math.max(above.x - above.width, row.x - row.width)
          : Math.min(above.x + above.width, row.x + row.width) > Math.max(above.x, row.x));
      if (above && overlapsHorizontally && row.y - above.y < nameFontSize * 1.05) {
        row.y = Math.min(above.y + nameFontSize * 1.05, row.y + labelNudgeLimit);
      }
      labelY.set(row.id, row.y);
    });
  });

  // The braided trunk: silver and gold strands crossing twice on the way up.
  const trunkStrand = (sign: 1 | -1): Point[] => {
    const strand: Point[] = [];
    for (let i = 0; i <= 24; i++) {
      const y = lerp(ROOT_Y, CANOPY_Y, i / 24);
      strand.push({ x: CANOPY_X + sign * 17 * Math.sin((Math.PI * (ROOT_Y - y)) / BRAID_PERIOD), y });
    }
    return strand;
  };

  // The canopy needs every pixel the page will give it — names ring the crown
  // out to the viewBox edge, and at column width they shrink to nothing.
  return (
    <div className="relative mx-auto w-full max-w-none select-none" aria-label="Tree of confirmed guests">
      <style>{`
        .rvtree3-limb {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: rvtree3Draw 2.2s cubic-bezier(0.4, 0, 0.3, 1) forwards;
        }
        .rvtree3-leaf {
          opacity: 0;
          animation: rvtree3Fade 1.3s ease forwards;
        }
        .rvtree3-canopy {
          transform-origin: ${CANOPY_X}px ${CANOPY_Y}px;
          animation: rvtree3Sway 9s ease-in-out infinite alternate;
        }
        @keyframes rvtree3Draw { to { stroke-dashoffset: 0; } }
        @keyframes rvtree3Fade { to { opacity: 1; } }
        @keyframes rvtree3Sway {
          from { transform: rotate(-0.35deg); }
          to { transform: rotate(0.35deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rvtree3-limb { animation: none; stroke-dashoffset: 0; transition: none !important; }
          .rvtree3-leaf { animation: none; opacity: 1; transition: none !important; }
          .rvtree3-canopy { animation: none; }
        }
      `}</style>
      <svg viewBox={VIEW_BOX} className="h-auto w-full" role="img">
        <defs>
          <radialGradient id="rvtree3-ground-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d9b26a" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#d9b26a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={CANOPY_X} cy={ROOT_Y + 28} rx={300} ry={52} fill="url(#rvtree3-ground-glow)" />
        {/* Roots flaring below the braid */}
        {[-1, 1].map((sign) =>
          [0.4, 1].map((spread) => (
            <TaperedLimb
              key={`root-${sign}-${spread}`}
              samples={sampleQuadratic(
                { x: CANOPY_X + sign * 8, y: ROOT_Y - 6 },
                { x: CANOPY_X + sign * 40 * spread, y: ROOT_Y + 22 },
                { x: CANOPY_X + sign * 92 * spread, y: ROOT_Y + 44 },
                12,
              )}
              baseWidth={9}
              tipWidth={2}
              color={BARK_DEEP}
              gradientKey={`root-${sign}-${spread}`}
              drawDelaySeconds={0.1}
            />
          )),
        )}
        {/* The two of us: silver and gold strands braided into one trunk */}
        {([
          { sign: 1 as const, color: '#c9a45c' },
          { sign: -1 as const, color: '#a9bbd1' },
        ]).map((strand) => (
          <g key={strand.sign}>
            <path
              d={smoothPath(trunkStrand(strand.sign)) ?? ''}
              pathLength={1}
              className="rvtree3-limb"
              style={{ animationDelay: '0s' }}
              fill="none"
              stroke="#000000"
              strokeWidth={19}
              strokeLinecap="round"
            />
            <path
              d={smoothPath(trunkStrand(strand.sign)) ?? ''}
              pathLength={1}
              className="rvtree3-limb"
              style={{ animationDelay: '0s' }}
              fill="none"
              stroke={strand.color}
              strokeWidth={14}
              strokeOpacity={0.9}
              strokeLinecap="round"
            />
          </g>
        ))}
        <text
          x={CANOPY_X - 96}
          y={ROOT_Y + 52}
          textAnchor="end"
          className={playfair.className}
          fontSize={27}
          fontStyle="italic"
          fill="#a9bbd1"
        >
          Elizabeth
        </text>
        <text
          x={CANOPY_X + 96}
          y={ROOT_Y + 52}
          textAnchor="start"
          className={playfair.className}
          fontSize={27}
          fontStyle="italic"
          fill="#c9a45c"
        >
          Ray
        </text>
        <text
          x={CANOPY_X}
          y={ROOT_Y + 96}
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

        <g className="rvtree3-canopy">
          {boughs.map((bough, boughIndex) => (
            <g key={boughIndex}>
              <TaperedLimb
                samples={sampleQuadratic({ x: CANOPY_X, y: CANOPY_Y }, bough.control, bough.tip)}
                baseWidth={13}
                tipWidth={5.5}
                color={BARK}
                gradientKey={`bough-${boughIndex}`}
                drawDelaySeconds={limbDelay(0.45)}
              />
              {bough.boughFamilies.map((family) => {
                const twigRandom = createSeededRandom(`${family.familyKey}::twig`);
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
                      color={mixHex(BARK, BARK_TIP, 0.45)}
                      gradientKey={`twig-${family.familyKey}`}
                      drawDelaySeconds={limbDelay(0.95)}
                    />
                    {family.memberSlots.map((slot) => {
                      const leafPoint = polar(slot.theta, slot.radius);
                      const stemRandom = createSeededRandom(`${slot.person.id}::stem`);
                      const stemControl = {
                        x: lerp(family.anchor.x, leafPoint.x, 0.5) + (stemRandom() - 0.5) * 34,
                        y: lerp(family.anchor.y, leafPoint.y, 0.5) + (stemRandom() - 0.5) * 34,
                      };
                      const color = pickThreadColor(slot.person.side, slot.person.id);
                      const thetaDeg = (slot.theta * 180) / Math.PI;
                      const flip = Math.cos(slot.theta) < 0;
                      const labelPoint = polar(slot.theta, slot.radius + 17);
                      // Horizontal labels run straight out to the viewBox edge
                      // from wherever the leaf sits, so the room is simply the
                      // distance left on that side.
                      const roomPx = flip ? labelPoint.x - 18 : VIEW_W - 18 - labelPoint.x;
                      const maxNameChars = Math.max(
                        12,
                        Math.min(28, Math.floor(roomPx / (nameFontSize * 0.54))),
                      );
                      const fadeDelay = `${(entrance === 'staggered'
                        ? 1.25 + slot.slotIndex * 0.016
                        : 0.35
                      ).toFixed(2)}s`;
                      return (
                        <g key={slot.person.id}>
                          <path
                            d={smoothPath(sampleQuadratic(family.anchor, stemControl, leafPoint, 14)) ?? ''}
                            pathLength={1}
                            className="rvtree3-limb"
                            style={{ animationDelay: `${limbDelay(1.15)}s`, transition: REWEAVE_TRANSITION }}
                            fill="none"
                            stroke={BARK_TIP}
                            strokeWidth={1.4}
                            strokeOpacity={0.9}
                            strokeLinecap="round"
                          />
                          <g
                            transform={`translate(${leafPoint.x} ${leafPoint.y}) rotate(${thetaDeg + 38})`}
                            style={{ transition: 'transform 900ms ease' }}
                          >
                            <ellipse
                              rx={7.5}
                              ry={3.4}
                              fill={color}
                              className="rvtree3-leaf"
                              style={{ animationDelay: fadeDelay }}
                              opacity={0.95}
                            />
                          </g>
                          <text
                            x={labelPoint.x}
                            y={labelY.get(slot.person.id) ?? labelPoint.y}
                            textAnchor={flip ? 'end' : 'start'}
                            dominantBaseline="middle"
                            className={`${playfair.className} rvtree3-leaf`}
                            style={{
                              animationDelay: fadeDelay,
                              transition: 'x 900ms ease, y 900ms ease, font-size 900ms ease',
                            }}
                            fontSize={nameFontSize}
                            fill={color}
                          >
                            {slot.person.hovertext ? <title>{slot.person.hovertext}</title> : null}
                            {truncateName(slot.person.name, maxNameChars)}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default TreeV3Tapestry;
