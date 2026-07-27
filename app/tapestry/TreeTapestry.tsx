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
const VIEW_W = 1240;
// Vertically cropped to the tree itself: the canopy's farthest label reaches
// y≈239, the root inscription ends y≈1300.
const VIEW_BOX = '0 225 1240 1095';
const CANOPY_X = 620;
const CANOPY_Y = 855;
const ROOT_Y = 1195;
const SECTOR_START = (-197 * Math.PI) / 180;
const SECTOR_END = (17 * Math.PI) / 180;
const RING_BASE = 280;
const RING_STEP = 92;
const BARK = '#9b7b4c';
const BARK_DEEP = '#77592f';
// Canopy geometry depends on the guest count, so limbs and leaves carry CSS
// transitions — each new arrival makes the whole crown gently re-arrange.
const REWEAVE_TRANSITION = 'd 900ms ease';

type Point = { x: number; y: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const polar = (theta: number, radius: number): Point => ({
  x: CANOPY_X + radius * Math.cos(theta),
  y: CANOPY_Y + radius * Math.sin(theta),
});

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
// width over a shrinking prefix of the same curve fake a tapered limb.
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
          className="rvtree-limb"
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

const TreeTapestry = ({
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
  const nameFontSize = Math.max(11, Math.min(15, arcGapPx * 0.42));

  // The braided trunk: silver and gold strands crossing twice on the way up.
  const trunkStrand = (sign: 1 | -1): Point[] => {
    const strand: Point[] = [];
    for (let i = 0; i <= 24; i++) {
      const y = lerp(ROOT_Y, CANOPY_Y, i / 24);
      strand.push({ x: CANOPY_X + sign * 17 * Math.sin((Math.PI * (ROOT_Y - y)) / 172.5), y });
    }
    return strand;
  };

  return (
    <div className="relative mx-auto w-full max-w-3xl select-none" aria-label="Tree of confirmed guests">
      <style>{`
        .rvtree-limb {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: rvtreeDraw 2.2s cubic-bezier(0.4, 0, 0.3, 1) forwards;
        }
        .rvtree-leaf {
          opacity: 0;
          animation: rvtreeFade 1.3s ease forwards;
        }
        .rvtree-canopy {
          transform-origin: ${CANOPY_X}px ${CANOPY_Y}px;
          animation: rvtreeSway 9s ease-in-out infinite alternate;
        }
        @keyframes rvtreeDraw { to { stroke-dashoffset: 0; } }
        @keyframes rvtreeFade { to { opacity: 1; } }
        @keyframes rvtreeSway {
          from { transform: rotate(-0.35deg); }
          to { transform: rotate(0.35deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rvtree-limb { animation: none; stroke-dashoffset: 0; transition: none !important; }
          .rvtree-leaf { animation: none; opacity: 1; transition: none !important; }
          .rvtree-canopy { animation: none; }
        }
      `}</style>
      <svg viewBox={VIEW_BOX} className="h-auto w-full" role="img">
        <defs>
          <radialGradient id="rvtree-ground-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d9b26a" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#d9b26a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={CANOPY_X} cy={ROOT_Y + 28} rx={300} ry={52} fill="url(#rvtree-ground-glow)" />
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
              className="rvtree-limb"
              style={{ animationDelay: '0s' }}
              fill="none"
              stroke="#000000"
              strokeWidth={19}
              strokeLinecap="round"
            />
            <path
              d={smoothPath(trunkStrand(strand.sign)) ?? ''}
              pathLength={1}
              className="rvtree-limb"
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

        <g className="rvtree-canopy">
          {boughs.map((bough, boughIndex) => (
            <g key={boughIndex}>
              <TaperedLimb
                samples={sampleQuadratic({ x: CANOPY_X, y: CANOPY_Y }, bough.control, bough.tip)}
                baseWidth={13}
                tipWidth={5.5}
                color={BARK}
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
                      color={BARK}
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
                      // Near-horizontal labels run toward the viewBox edge, so
                      // their room shrinks with 1/|cos θ|; vertical ones can
                      // afford their full name.
                      const roomPx =
                        (VIEW_W / 2 - 18) / Math.max(Math.abs(Math.cos(slot.theta)), 0.4) -
                        (slot.radius + 17);
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
                            className="rvtree-limb"
                            style={{ animationDelay: `${limbDelay(1.15)}s`, transition: REWEAVE_TRANSITION }}
                            fill="none"
                            stroke={BARK}
                            strokeWidth={1.4}
                            strokeOpacity={0.8}
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
                              className="rvtree-leaf"
                              style={{ animationDelay: fadeDelay }}
                              opacity={0.95}
                            />
                          </g>
                          <text
                            transform={`translate(${labelPoint.x} ${labelPoint.y}) rotate(${
                              flip ? thetaDeg + 180 : thetaDeg
                            })`}
                            textAnchor={flip ? 'end' : 'start'}
                            dominantBaseline="middle"
                            className={`${playfair.className} rvtree-leaf`}
                            style={{
                              animationDelay: fadeDelay,
                              transition: 'transform 900ms ease, font-size 900ms ease',
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

export default TreeTapestry;
