import { line, curveCatmullRom } from 'd3-shape';
import { playfair, cormorant } from '../handfasting-simple/save-the-date/handfastingInvitationTypography';
import { PAGE_BLACK, pickThreadColor, truncateName } from './tapestryPalette';
import { groupIntoFamilies } from './tapestryOrdering';
import { createSeededRandom, hashStringToSeed } from './tapestrySeededRandom';
import type { TapestryEntrance, TapestryPerson } from './tapestryTypes';

// An oak, built the way the knot is built: every guest is one thread, and the
// trunk is the handfasting cord — all of those threads braided together and
// running down into the roots, where Elizabeth and Ray stand at the base.
//
// The friends the couple share are the heart of the crown, stacked over the
// trunk in the middle. Her people are the left bough, his the right, so the
// canopy reads blue on one side, wine on the other, cream up the centre.
//
// The canopy outline is an arc: a name sits close to the trunk at the crown,
// swings out to its widest at the shoulder, and draws back in as the lowest
// boughs reach down — which is what gives the silhouette its spread.
//
// Two things make it read as branching rather than as a bundle: a bough joins
// the trunk at its OWN height (crown names high, low names low), and the trunk
// is a set of parallel lanes — shared friends innermost, then the couple's
// braid, then each side's bough rail — so no thread ever crosses a name to get
// where it is going.
//
// Names are horizontal everywhere; nothing is set on an angle.
//
// Canopy geometry depends on the counts, so paths carry a CSS `d` transition —
// each arrival gently re-grows the crown (browsers without `d` transitions just
// snap).
const VIEW_W = 1200;
const VIEW_BOX = '0 60 1200 1450';
const TRUNK_X = 600;
const ROOT_Y = 1330;
// Threads run a little past the root flare, so the bundle disappears into the
// ground rather than stopping on top of it.
const ROOT_TIP_Y = 1374;

// The canopy edge, as a function of height.
const ARC_TOP_Y = 96;
const ARC_BOTTOM_Y = 1035;
const ARC_MID_Y = (ARC_TOP_Y + ARC_BOTTOM_Y) / 2;
const ARC_DX_TOP = 200;
const ARC_DX_MAX = 400;
const ARC_DX_END = 300;
const ARC_THETA_TOP = Math.asin(ARC_DX_TOP / ARC_DX_MAX);
const ARC_THETA_END = Math.PI - Math.asin(ARC_DX_END / ARC_DX_MAX);
const MAX_ROW_GAP = 52;
const NAME_GAP = 14;

// The heart of the crown: shared friends stacked over the trunk.
const CENTER_TOP = 122;
const CENTER_BOTTOM = 394;
const CENTER_MAX_GAP = 31;
const CENTER_LANE_MIN = 44;
const CENTER_LANE_MAX = 128;

// Trunk lanes, outermost last.
const BOUGH_RAIL_DX = 178;
const FOUNDER_BRAID_DX = 25;

// A bough meets the trunk somewhere along this stretch — crown boughs join
// high, the ones reaching for the ground join low.
const TRUNK_JOIN_TOP = 430;
const TRUNK_JOIN_BOTTOM = 1120;
const TRUNK_SAMPLES = 26;

const BARK_DEEP = '#77592f';
const ELIZABETH_INK = '#cdd9e9';
const RAY_INK = '#d9848f';
const REWEAVE_TRANSITION = 'd 900ms ease';

// Playfair runs a little over half its point size per mixed-case character.
// Used both to trim names to the room actually beside them and to start each
// shared friend's thread at the end of their own name.
const CHAR_WIDTH_RATIO = 0.55;

type Point = { x: number; y: number };
type TreeGroup = 'left' | 'right' | 'center';
type TreeThread = {
  person: TapestryPerson;
  group: TreeGroup;
  rowIndex: number;
  rowCount: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const fitChars = (room: number, fontSize: number) =>
  Math.max(6, Math.floor(room / (fontSize * CHAR_WIDTH_RATIO)));
const halfNameWidth = (text: string, fontSize: number) =>
  (text.length * fontSize * CHAR_WIDTH_RATIO) / 2;

const threadPathLine = line<Point>()
  .x((p) => p.x)
  .y((p) => p.y)
  .curve(curveCatmullRom.alpha(0.6));

// The canopy outline: a quarter-turn past vertical, so the arc opens out from
// the crown and closes back in at the lowest boughs.
const arcDx = (y: number): number => {
  const u = clamp01((y - ARC_TOP_Y) / (ARC_BOTTOM_Y - ARC_TOP_Y));
  return ARC_DX_MAX * Math.sin(lerp(ARC_THETA_TOP, ARC_THETA_END, u));
};

// Lanes draw together as they near the roots, so the bundle tapers into a
// trunk instead of falling as a flat-sided column. Keyed to absolute height,
// not to each thread's own run, so every strand at a given height is squeezed
// by the same amount.
const trunkSqueeze = (y: number): number => {
  const t = clamp01((y - TRUNK_JOIN_TOP) / (ROOT_TIP_Y - TRUNK_JOIN_TOP));
  return lerp(1, 0.3, t * t);
};

const appendTrunk = (
  points: Point[],
  fromY: number,
  laneDx: number,
  seedText: string,
): Point[] => {
  const phase = createSeededRandom(`${seedText}::trunk`)() * Math.PI * 2;
  const braidAmplitude = 5 + Math.abs(laneDx) * 0.045;
  for (let i = 1; i <= TRUNK_SAMPLES; i++) {
    const y = lerp(fromY, ROOT_TIP_Y, i / TRUNK_SAMPLES);
    points.push({
      x:
        TRUNK_X +
        laneDx * trunkSqueeze(y) +
        braidAmplitude * Math.sin((2 * Math.PI * (y - TRUNK_JOIN_TOP)) / 330 + phase),
      y,
    });
  }
  return points;
};

// A bough: name at the tip → a branch that leaves almost level and then bends
// in to meet the trunk at its own height → down the rail → into the roots.
const buildBoughThreadPath = (
  column: 'left' | 'right',
  seedText: string,
  startY: number,
  startDx: number,
  joinY: number,
  offset: number,
): string => {
  const dir = column === 'left' ? -1 : 1;
  const railDx = dir * BOUGH_RAIL_DX + offset;
  const points: Point[] = [
    { x: TRUNK_X + dir * startDx, y: startY },
    { x: TRUNK_X + dir * lerp(BOUGH_RAIL_DX, startDx, 0.7), y: lerp(joinY, startY, 0.72) },
    { x: TRUNK_X + railDx, y: joinY },
  ];
  return threadPathLine(appendTrunk(points, joinY, railDx, seedText)) ?? '';
};

// Shared-friend thread: it leaves from the END of its own name — the way a
// bough thread leaves its tip — so nothing is ever ruled underneath the text.
// From there it takes a lane of its own, wide enough to clear every name still
// below it, straight down the heart of the trunk.
const buildHeartThreadPath = (
  seedText: string,
  startY: number,
  laneDir: number,
  laneDx: number,
  nameHalfWidth: number,
  offset: number,
): string => {
  const laneX = TRUNK_X + laneDir * laneDx;
  const points: Point[] = [
    { x: TRUNK_X + laneDir * (nameHalfWidth + 7), y: startY + 1 },
    { x: laneX, y: startY + 28 },
    { x: laneX, y: lerp(startY + 28, TRUNK_JOIN_TOP, 0.82) },
  ];
  return threadPathLine(
    appendTrunk(points, TRUNK_JOIN_TOP, laneDir * laneDx * 0.45 + offset, seedText),
  ) ?? '';
};

// Bough blocks centre on the arc's midpoint, so a side with few RSVPs reads as
// a quieter cluster at the canopy's shoulder rather than a stubby list.
const sideRowGap = (rowCount: number): number =>
  rowCount <= 1 ? 0 : Math.min(MAX_ROW_GAP, (ARC_BOTTOM_Y - ARC_TOP_Y) / (rowCount - 1));

const sideRowY = (rowIndex: number, rowCount: number): number => {
  const gap = sideRowGap(rowCount);
  return ARC_MID_Y - (gap * Math.max(rowCount - 1, 0)) / 2 + rowIndex * gap;
};

const centerRowGap = (rowCount: number): number =>
  rowCount <= 1 ? 0 : Math.min(CENTER_MAX_GAP, (CENTER_BOTTOM - CENTER_TOP) / (rowCount - 1));

const centerRowY = (rowIndex: number, rowCount: number): number =>
  CENTER_TOP + rowIndex * centerRowGap(rowCount);

const threadOffset = (rowIndex: number, rowCount: number, seedText: string): number => {
  const rowT = rowCount <= 1 ? 0.5 : rowIndex / (rowCount - 1);
  return (rowT - 0.5) * 30 + (createSeededRandom(`${seedText}::offset`)() - 0.5) * 5;
};

// Her people left, his right, shared friends the centre channel — the three
// "who knows them" groups, families kept adjacent within each.
const assignGroups = (persons: TapestryPerson[]): TreeThread[] => {
  const families = groupIntoFamilies(persons);
  const grouped: Record<TreeGroup, TapestryPerson[]> = { left: [], right: [], center: [] };
  for (const family of families) {
    const group: TreeGroup =
      family.side === 'elizabeth' ? 'left' : family.side === 'ray' ? 'right' : 'center';
    grouped[group].push(...family.members);
  }
  return (Object.keys(grouped) as TreeGroup[]).flatMap((group) =>
    grouped[group].map((person, rowIndex) => ({
      person,
      group,
      rowIndex,
      rowCount: grouped[group].length,
    })),
  );
};

// The couple's own braid: two strands crossing their way up the heart of the
// trunk, from the roots to the foot of the crown.
const founderStrand = (sign: 1 | -1): Point[] => {
  const strand: Point[] = [];
  for (let i = 0; i <= 32; i++) {
    const y = lerp(ROOT_TIP_Y, TRUNK_JOIN_TOP, i / 32);
    const depth = ROOT_TIP_Y - y;
    strand.push({
      x: TRUNK_X + sign * FOUNDER_BRAID_DX * Math.sin((Math.PI * depth) / 157),
      y,
    });
  }
  return strand;
};

const TreeV2Tapestry = ({
  persons,
  entrance = 'staggered',
}: {
  persons: TapestryPerson[];
  entrance?: TapestryEntrance;
}) => {
  const threads = assignGroups(persons);
  // One type size across both boughs, set by whichever side is denser — two
  // different sizes facing each other reads as a mistake.
  const sideRows = Math.max(...threads.filter((t) => t.group !== 'center').map((t) => t.rowCount), 1);
  const sideGap = sideRows <= 1 ? MAX_ROW_GAP : sideRowGap(sideRows);
  const sideFontSize = Math.max(13, Math.min(18, sideGap * 0.62));
  const centerRows = Math.max(...threads.filter((t) => t.group === 'center').map((t) => t.rowCount), 1);
  const centerGap = centerRows <= 1 ? CENTER_MAX_GAP : centerRowGap(centerRows);
  const centerFontSize = Math.max(13, Math.min(17.5, centerGap * 0.55));
  const centerChars = fitChars((CENTER_LANE_MAX - 14) * 2, centerFontSize);

  // Each shared friend's lane only has to clear the widest name still beneath
  // them, so the heart strands taper to a chalice as the list runs out rather
  // than running down as one flat-sided box.
  const centerNames = threads
    .filter((thread) => thread.group === 'center')
    .sort((a, b) => a.rowIndex - b.rowIndex)
    .map((thread) => truncateName(thread.person.name, centerChars));
  const centerLaneDx = (rowIndex: number): number => {
    let widest = 0;
    for (let below = rowIndex + 1; below < centerNames.length; below++) {
      widest = Math.max(widest, halfNameWidth(centerNames[below], centerFontSize));
    }
    return Math.min(CENTER_LANE_MAX, Math.max(CENTER_LANE_MIN, widest + 16));
  };

  const laid = threads.map((thread) => {
    const isCenter = thread.group === 'center';
    const offset = threadOffset(thread.rowIndex, thread.rowCount, thread.person.id);
    const color = pickThreadColor(thread.person.side, thread.person.id);
    const fontSize = isCenter ? centerFontSize : sideFontSize;

    if (isCenter) {
      const startY = centerRowY(thread.rowIndex, thread.rowCount);
      const label = truncateName(thread.person.name, centerChars);
      const laneDir = thread.rowIndex % 2 === 0 ? 1 : -1;
      return {
        thread,
        color,
        fontSize,
        label,
        nameX: TRUNK_X,
        nameY: startY,
        textAnchor: 'middle' as const,
        leaf: {
          x: TRUNK_X + laneDir * (halfNameWidth(label, fontSize) + 7),
          y: startY + 1,
          rotate: laneDir * 24,
        },
        path: buildHeartThreadPath(
          thread.person.id,
          startY,
          laneDir,
          centerLaneDx(thread.rowIndex),
          halfNameWidth(label, fontSize),
          offset,
        ),
      };
    }

    const column = thread.group as 'left' | 'right';
    const dir = column === 'left' ? -1 : 1;
    const startY = sideRowY(thread.rowIndex, thread.rowCount);
    const startDx = arcDx(startY);
    // Room is measured per row: the crown and the lowest boughs sit well
    // inboard of the shoulder, so their names have far more space than a
    // single worst-case budget would allow them.
    const label = truncateName(
      thread.person.name,
      fitChars(VIEW_W / 2 - startDx - NAME_GAP - 18, fontSize),
    );
    const rowT = clamp01((startY - ARC_TOP_Y) / (ARC_BOTTOM_Y - ARC_TOP_Y));
    return {
      thread,
      color,
      fontSize,
      label,
      nameX: TRUNK_X + dir * (startDx + NAME_GAP),
      nameY: startY,
      textAnchor: (column === 'left' ? 'end' : 'start') as 'end' | 'start',
      leaf: { x: TRUNK_X + dir * startDx, y: startY, rotate: dir * 22 },
      path: buildBoughThreadPath(
        column,
        thread.person.id,
        startY,
        startDx,
        lerp(TRUNK_JOIN_TOP, TRUNK_JOIN_BOTTOM, rowT),
        offset,
      ),
    };
  });

  // Paint order varies which thread lies on top at each crossing (the weave),
  // but it must be STABLE per person: sorting by anything count-dependent
  // would reorder DOM nodes on every new arrival, and a moved node restarts
  // its CSS draw-in animation.
  const paintOrder = [...laid].sort(
    (a, b) => hashStringToSeed(a.thread.person.id) - hashStringToSeed(b.thread.person.id),
  );
  const fadeDelay = (index: number) =>
    `${(entrance === 'staggered' ? 1.05 + index * 0.016 : 0.35).toFixed(2)}s`;
  const drawDelay = (staggeredSeconds: number) =>
    `${(entrance === 'staggered' ? staggeredSeconds : 0.1).toFixed(2)}s`;

  return (
    <div className="relative mx-auto w-full max-w-3xl select-none" aria-label="Tree of confirmed guests">
      <style>{`
        .rvtree2-limb {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: rvtree2Draw 2.6s cubic-bezier(0.4, 0, 0.3, 1) forwards;
        }
        .rvtree2-leaf {
          opacity: 0;
          animation: rvtree2Fade 1.3s ease forwards;
        }
        /* The whole tree leans, hinged at the root, so no thread is ever torn
           away from the trunk it runs into. */
        .rvtree2-sway {
          transform-origin: ${TRUNK_X}px ${ROOT_Y}px;
          animation: rvtree2Sway 11s ease-in-out infinite alternate;
        }
        @keyframes rvtree2Draw { to { stroke-dashoffset: 0; } }
        @keyframes rvtree2Fade { to { opacity: 1; } }
        @keyframes rvtree2Sway {
          from { transform: rotate(-0.32deg); }
          to { transform: rotate(0.32deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rvtree2-limb { animation: none; stroke-dashoffset: 0; transition: none !important; }
          .rvtree2-leaf { animation: none; opacity: 1; transition: none !important; }
          .rvtree2-sway { animation: none; }
        }
      `}</style>
      <svg viewBox={VIEW_BOX} className="h-auto w-full" role="img">
        <defs>
          <radialGradient id="rvtree2-ground-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#d9b26a" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#d9b26a" stopOpacity="0" />
          </radialGradient>
          <filter id="rvtree2-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <ellipse cx={TRUNK_X} cy={ROOT_Y + 30} rx={300} ry={52} fill="url(#rvtree2-ground-glow)" />

        <g className="rvtree2-sway">
          {/* Every guest's thread, drawn before any name so nothing is ruled
              through the text. */}
          {paintOrder.map((entry) => (
            <g key={entry.thread.person.id}>
              <path
                d={entry.path}
                pathLength={1}
                className="rvtree2-limb"
                style={{ animationDelay: drawDelay(0.4), transition: REWEAVE_TRANSITION }}
                fill="none"
                stroke={PAGE_BLACK}
                strokeWidth={5.4}
                strokeLinecap="round"
              />
              <path
                d={entry.path}
                pathLength={1}
                className="rvtree2-limb"
                style={{ animationDelay: drawDelay(0.4), transition: REWEAVE_TRANSITION }}
                fill="none"
                stroke={entry.color}
                strokeWidth={entry.thread.group === 'center' ? 2.3 : 2.05}
                strokeOpacity={0.92}
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* The couple: the braid at the heart of the trunk, tied before the
              first RSVP and painted over the cord. */}
          {([
            { sign: -1 as const, color: ELIZABETH_INK },
            { sign: 1 as const, color: RAY_INK },
          ]).map((strand) => (
            <g key={strand.sign}>
              <path
                d={threadPathLine(founderStrand(strand.sign)) ?? ''}
                pathLength={1}
                className="rvtree2-limb"
                style={{ animationDelay: '0s' }}
                fill="none"
                stroke={PAGE_BLACK}
                strokeWidth={11}
                strokeLinecap="round"
              />
              <path
                d={threadPathLine(founderStrand(strand.sign)) ?? ''}
                pathLength={1}
                className="rvtree2-limb"
                style={{ animationDelay: '0s' }}
                fill="none"
                stroke={strand.color}
                strokeWidth={5.2}
                strokeOpacity={0.97}
                strokeLinecap="round"
                filter="url(#rvtree2-soft-glow)"
              />
            </g>
          ))}

          {/* Roots flaring out from the foot of the braid */}
          {[-1, 1].map((sign) =>
            [0.45, 1].map((spread) => (
              <path
                key={`root-${sign}-${spread}`}
                d={
                  threadPathLine([
                    { x: TRUNK_X + sign * 6, y: ROOT_Y - 40 },
                    { x: TRUNK_X + sign * 44 * spread, y: ROOT_Y + 6 },
                    { x: TRUNK_X + sign * 96 * spread, y: ROOT_Y + 40 },
                  ]) ?? ''
                }
                pathLength={1}
                className="rvtree2-limb"
                style={{ animationDelay: '0s' }}
                fill="none"
                stroke={BARK_DEEP}
                strokeWidth={5}
                strokeLinecap="round"
                strokeOpacity={0.85}
              />
            )),
          )}

          {/* Leaves and names last, so the canopy sits over its own branches. */}
          {laid.map((entry, index) => (
            <g key={`${entry.thread.person.id}-leaf`}>
              <ellipse
                cx={0}
                cy={0}
                rx={7}
                ry={3.2}
                transform={`translate(${entry.leaf.x} ${entry.leaf.y}) rotate(${entry.leaf.rotate})`}
                fill={entry.color}
                className="rvtree2-leaf"
                style={{ animationDelay: fadeDelay(index), transition: 'transform 900ms ease' }}
                opacity={0.95}
              />
              <text
                x={entry.nameX}
                y={entry.nameY}
                textAnchor={entry.textAnchor}
                dominantBaseline="middle"
                className={`${playfair.className} rvtree2-leaf`}
                style={{
                  animationDelay: fadeDelay(index),
                  transition: 'x 900ms ease, y 900ms ease, font-size 900ms ease',
                }}
                fontSize={entry.fontSize}
                fill={entry.color}
              >
                {entry.thread.person.hovertext ? <title>{entry.thread.person.hovertext}</title> : null}
                {entry.label}
              </text>
            </g>
          ))}
        </g>

        <text
          x={TRUNK_X - 104}
          y={ROOT_Y + 92}
          textAnchor="end"
          className={playfair.className}
          fontSize={27}
          fontStyle="italic"
          fill={ELIZABETH_INK}
          filter="url(#rvtree2-soft-glow)"
        >
          Elizabeth
        </text>
        <text
          x={TRUNK_X}
          y={ROOT_Y + 92}
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
          x={TRUNK_X + 104}
          y={ROOT_Y + 92}
          textAnchor="start"
          className={playfair.className}
          fontSize={27}
          fontStyle="italic"
          fill={RAY_INK}
          filter="url(#rvtree2-soft-glow)"
        >
          Ray
        </text>
        <text
          x={TRUNK_X}
          y={ROOT_Y + 136}
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

export default TreeV2Tapestry;
