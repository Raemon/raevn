import { line, curveCatmullRom } from 'd3-shape';
import { playfair } from '../handfasting-simple/save-the-date/handfastingInvitationTypography';
import { NAME_INK, PAGE_BLACK, pickThreadColor, truncateName } from './tapestryPalette';
import { groupIntoFamilies } from './tapestryOrdering';
import { createSeededRandom, hashStringToSeed } from './tapestrySeededRandom';
import type { TapestryEntrance, TapestryPerson } from './tapestryTypes';

// An oak. The braided cord falling from the knot is the trunk; it rises
// through the knot and up the centre, past the friends the couple share, to
// Elizabeth and Ray side by side at the crown. Everyone else is a bough.
//
// The two boughs are arcs in the shape of a spreading canopy: they start close
// to the trunk up at the crown, sweep out to their widest around the knot, and
// curve back inward as they fall past it — so the names wrap around the knot
// instead of stopping above it, and the outline arcs in at both ends.
//
// Every guest is still one thread. Elizabeth's people loop the left lobe of
// the infinity knot, Ray's the right, shared friends trace the whole
// figure-eight around both — then all of it braids into the single cord below.
//
// Two things make it read as branching rather than as a bundle: a bough joins
// the trunk at its OWN height (crown names high, low names low), and the trunk
// is a set of parallel lanes — shared friends innermost, then the couple, then
// each side's bough rail — so no thread ever crosses a name to get where it is
// going. The low boughs sweep a long way up and in, which is what gives the
// canopy its fan.
//
// Names are horizontal everywhere; nothing is set on an angle.
//
// Guest geometry depends on the counts, so paths carry a CSS `d` transition —
// each arrival gently re-weaves the cord (browsers without `d` transitions
// just snap).
const VIEW_W = 1200;
const VIEW_H = 1440;
const KNOT_X = 600;
const KNOT_Y = 770;
const LOBE_RADIUS = 215;
const LOBE_Y_SCALE = 1.55;
const CORD_HALF_WIDTH = 17;

// The canopy edge. A name's distance from the trunk is a function of its
// height: close in at the crown, widest around the knot, arcing back in as the
// bough falls past it.
const ARC_TOP_Y = 118;
const ARC_BOTTOM_Y = 1040;
const ARC_MID_Y = (ARC_TOP_Y + ARC_BOTTOM_Y) / 2;
const ARC_DX_TOP = 210;
const ARC_DX_MAX = 400;
const ARC_DX_END = 300;
const ARC_THETA_TOP = Math.asin(ARC_DX_TOP / ARC_DX_MAX);
const ARC_THETA_END = Math.PI - Math.asin(ARC_DX_END / ARC_DX_MAX);
const MAX_ROW_GAP = 56;
const NAME_GAP = 14;

// Trunk lanes, innermost first. Shared friends get a lane each, sized to clear
// the widest name still below them, so their strands taper to a chalice as the
// list runs out rather than falling as one flat-sided box.
const CENTER_LANE_MIN = 44;
const CENTER_LANE_MAX = 132;
const FOUNDER_RAIL_DX = 156;
const BOUGH_RAIL_DX = 180;

// A bough meets the trunk somewhere along this stretch — crown boughs join
// high, the ones falling past the knot join low.
const TRUNK_JOIN_TOP = 300;
const TRUNK_JOIN_BOTTOM = KNOT_Y - 150;

// The crown: the couple close together over the trunk, the friends they share
// gathered just beneath them.
const FOUNDER_Y = 90;
const FOUNDER_NAME_GAP = 26;
const FOUNDER_START_DX = 88;
const CENTER_TOP = 138;
const CENTER_BOTTOM = 402;
const CENTER_MAX_GAP = 31;

const LOBE_SAMPLES = 56;
const TAIL_SAMPLES = 26;
const TAIL_BASE_END = 1345;
const REWEAVE_TRANSITION = 'd 900ms ease';

// Playfair runs a little over half its point size per mixed-case character.
// Used both to trim names to the room actually beside them and to start each
// shared friend's thread at the end of their own name.
const CHAR_WIDTH_RATIO = 0.55;
// The -22 is slack: CHAR_WIDTH_RATIO under-reads Playfair's widest glyphs, and
// the canopy's outermost names sit within a few units of the canvas edge.
const SIDE_NAME_ROOM = VIEW_W / 2 - ARC_DX_MAX - NAME_GAP - 22;
const CENTER_NAME_ROOM = (CENTER_LANE_MAX - 14) * 2;

type Point = { x: number; y: number };
type KnotGroup = 'left' | 'right' | 'center';
type KnotThread = {
  person: TapestryPerson;
  group: KnotGroup;
  rowIndex: number;
  rowCount: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const fitChars = (room: number, fontSize: number) =>
  Math.max(6, Math.floor(room / (fontSize * CHAR_WIDTH_RATIO)));
const halfNameWidth = (text: string, fontSize: number) =>
  (text.length * fontSize * CHAR_WIDTH_RATIO) / 2;

const lemniscatePoint = (t: number): Point => {
  const denom = 1 + Math.sin(t) ** 2;
  return {
    x: KNOT_X + (LOBE_RADIUS * Math.cos(t)) / denom,
    y: KNOT_Y + (LOBE_RADIUS * LOBE_Y_SCALE * Math.sin(t) * Math.cos(t)) / denom,
  };
};

// Centerline samples plus unit normals, so parallel threads can ride the same
// curve offset sideways — a cord of many strands rather than one line.
const sampleLemniscate = (tStart: number, tEnd: number, sampleCount: number) => {
  const centers: Point[] = [];
  for (let i = 0; i <= sampleCount; i++) {
    centers.push(lemniscatePoint(lerp(tStart, tEnd, i / sampleCount)));
  }
  const normals: Point[] = centers.map((p, i) => {
    const ahead = centers[Math.min(i + 1, centers.length - 1)];
    const behind = centers[Math.max(i - 1, 0)];
    const dx = ahead.x - behind.x;
    const dy = ahead.y - behind.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: -dy / len, y: dx / len };
  });
  return { centers, normals };
};

const LOBE_TRIM = 0.15;
const LEFT_LOBE = sampleLemniscate(
  Math.PI / 2 + LOBE_TRIM,
  (3 * Math.PI) / 2 - LOBE_TRIM,
  LOBE_SAMPLES,
);
const RIGHT_LOBE = sampleLemniscate(
  -Math.PI / 2 + LOBE_TRIM,
  Math.PI / 2 - LOBE_TRIM,
  LOBE_SAMPLES,
);
// Shared friends sweep the whole figure-eight: left lobe then right lobe in
// one continuous parameter run.
const FULL_EIGHT = sampleLemniscate(
  Math.PI / 2 + LOBE_TRIM,
  (5 * Math.PI) / 2 - LOBE_TRIM,
  LOBE_SAMPLES * 2,
);

const threadPathLine = line<Point>()
  .x((p) => p.x)
  .y((p) => p.y)
  .curve(curveCatmullRom.alpha(0.6));

const appendTail = (
  points: Point[],
  phase: number,
  offset: number,
  seedText: string,
): Point[] => {
  const random = createSeededRandom(`${seedText}::tail`);
  const braidAmplitude = 8 + Math.abs(offset) * 0.55;
  const tailEnd = TAIL_BASE_END + random() * 55;
  for (let i = 0; i <= TAIL_SAMPLES; i++) {
    const t = i / TAIL_SAMPLES;
    const y = lerp(KNOT_Y + 26, tailEnd, t);
    const ramp = Math.min(1, (y - KNOT_Y) / 150);
    const splay = Math.max(0, (t - 0.82) / 0.18) ** 2;
    points.push({
      x:
        KNOT_X +
        offset * 0.35 +
        braidAmplitude * ramp * Math.cos((2 * Math.PI * (y - KNOT_Y)) / 310 + phase) +
        offset * 2.1 * splay,
      y,
    });
  }
  return points;
};

// The canopy outline: a quarter-turn past vertical, so the arc opens out from
// the crown and closes back in below the knot.
const arcDx = (y: number): number => {
  const u = clamp01((y - ARC_TOP_Y) / (ARC_BOTTOM_Y - ARC_TOP_Y));
  return ARC_DX_MAX * Math.sin(lerp(ARC_THETA_TOP, ARC_THETA_END, u));
};

const appendLobe = (
  points: Point[],
  lobe: { centers: Point[]; normals: Point[] },
  offset: number,
): Point[] => {
  for (let i = 0; i < lobe.centers.length; i++) {
    points.push({
      x: lobe.centers[i].x + lobe.normals[i].x * offset,
      y: lobe.centers[i].y + lobe.normals[i].y * offset,
    });
  }
  return points;
};

// A bough: name at the tip → a branch that leaves almost level and then bends
// in to meet the trunk at its own height → down the rail → around that side's
// lobe → into the braided tail. The couple reuse this from the crown on a rail
// of their own, inboard of everyone else's.
const buildBoughThreadPath = (
  column: 'left' | 'right',
  seedText: string,
  startY: number,
  startDx: number,
  joinY: number,
  railDx: number,
  offset: number,
): string => {
  const dir = column === 'left' ? -1 : 1;
  const lobe = column === 'left' ? LEFT_LOBE : RIGHT_LOBE;

  const points: Point[] = [{ x: KNOT_X + dir * startDx, y: startY }];
  points.push({
    x: KNOT_X + dir * lerp(railDx, startDx, 0.7),
    y: lerp(joinY, startY, 0.74),
  });
  points.push({ x: KNOT_X + dir * railDx + offset, y: joinY });
  points.push({ x: KNOT_X + dir * railDx * 0.6 + offset, y: KNOT_Y - 150 });
  points.push({ x: KNOT_X + dir * railDx * 0.22 + offset * 0.6, y: KNOT_Y - 46 });
  appendLobe(points, lobe, offset);
  return threadPathLine(appendTail(points, column === 'left' ? 0 : Math.PI, offset, seedText)) ?? '';
};

// Shared-friend thread: it leaves from the END of its own name — the way a
// bough thread leaves its tip — so nothing is ever ruled underneath the text.
// From there it takes a lane of its own, wide enough to clear every name still
// below it, down the heart of the trunk, then the whole figure-eight around
// both lobes, then the core of the braid.
const buildHeartThreadPath = (
  seedText: string,
  startY: number,
  laneDir: number,
  laneDx: number,
  nameHalfWidth: number,
  offset: number,
): string => {
  const laneX = KNOT_X + laneDir * laneDx;
  const points: Point[] = [
    { x: KNOT_X + laneDir * (nameHalfWidth + 7), y: startY + 1 },
    { x: laneX, y: startY + 30 },
    { x: laneX, y: lerp(startY + 30, KNOT_Y - 190, 0.86) },
    { x: KNOT_X + laneDir * 40 + offset * 0.6, y: KNOT_Y - 116 },
    { x: KNOT_X + offset * 0.9, y: KNOT_Y - 58 },
  ];
  appendLobe(points, FULL_EIGHT, offset);
  return threadPathLine(appendTail(points, Math.PI / 2, offset * 0.6, seedText)) ?? '';
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
  return (rowT - 0.5) * 2 * CORD_HALF_WIDTH + (createSeededRandom(`${seedText}::offset`)() - 0.5) * 5;
};

// Her people left, his right, shared friends the centre channel — the three
// "who knows them" groups, families kept adjacent within each.
const assignGroups = (persons: TapestryPerson[]): KnotThread[] => {
  const families = groupIntoFamilies(persons);
  const grouped: Record<KnotGroup, TapestryPerson[]> = { left: [], right: [], center: [] };
  for (const family of families) {
    const group: KnotGroup =
      family.side === 'elizabeth' ? 'left' : family.side === 'ray' ? 'right' : 'center';
    grouped[group].push(...family.members);
  }
  return (Object.keys(grouped) as KnotGroup[]).flatMap((group) =>
    grouped[group].map((person, rowIndex) => ({
      person,
      group,
      rowIndex,
      rowCount: grouped[group].length,
    })),
  );
};

const FOUNDERS = [
  { id: 'founder-elizabeth', name: 'Elizabeth', column: 'left' as const, color: '#cdd9e9' },
  { id: 'founder-ray', name: 'Ray', column: 'right' as const, color: '#d9848f' },
];

const KnotTapestry = ({
  persons,
  entrance = 'staggered',
}: {
  persons: TapestryPerson[];
  entrance?: TapestryEntrance;
}) => {
  const threads = assignGroups(persons);
  // Paint order varies which thread lies on top at each crossing (the weave),
  // but it must be STABLE per person: sorting by anything count-dependent
  // would reorder DOM nodes on every new arrival, and a moved node restarts
  // its CSS draw-in animation.
  const paintOrder = [...threads].sort(
    (a, b) => hashStringToSeed(a.person.id) - hashStringToSeed(b.person.id),
  );
  // One type size across both boughs, set by whichever side is denser — two
  // different sizes facing each other reads as a mistake.
  const sideRows = Math.max(...threads.filter((t) => t.group !== 'center').map((t) => t.rowCount), 1);
  const sideGap = sideRows <= 1 ? MAX_ROW_GAP : sideRowGap(sideRows);
  const sideFontSize = Math.max(11.5, Math.min(16.5, sideGap * 0.62));
  const sideChars = fitChars(SIDE_NAME_ROOM, sideFontSize);
  const centerRows = Math.max(...threads.filter((t) => t.group === 'center').map((t) => t.rowCount), 1);
  const centerGap = centerRows <= 1 ? CENTER_MAX_GAP : centerRowGap(centerRows);
  const centerFontSize = Math.max(12, Math.min(16, centerGap * 0.52));
  const centerChars = fitChars(CENTER_NAME_ROOM, centerFontSize);

  // Each shared friend's lane only has to clear the widest name still beneath
  // them, so the group's strands draw a chalice that narrows into the knot.
  const centerRowsInOrder = threads
    .filter((t) => t.group === 'center')
    .sort((a, b) => a.rowIndex - b.rowIndex);
  const centerLaneById = new Map<string, number>();
  let widestBelow = 0;
  for (let i = centerRowsInOrder.length - 1; i >= 0; i--) {
    centerLaneById.set(
      centerRowsInOrder[i].person.id,
      Math.max(CENTER_LANE_MIN, Math.min(CENTER_LANE_MAX, widestBelow + 15)),
    );
    widestBelow = Math.max(
      widestBelow,
      halfNameWidth(truncateName(centerRowsInOrder[i].person.name, centerChars), centerFontSize),
    );
  }

  return (
    <div className="rvknot-root relative mx-auto w-full max-w-6xl select-none" aria-label="Handfasting knot of confirmed guests">
      <style>{`
        .rvknot-thread {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: rvknotDraw 3s cubic-bezier(0.4, 0, 0.25, 1) forwards;
        }
        .rvknot-name {
          opacity: 0;
          animation: rvknotFade 1.4s ease forwards;
        }
        @keyframes rvknotDraw { to { stroke-dashoffset: 0; } }
        @keyframes rvknotFade { to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .rvknot-thread { animation: none; stroke-dashoffset: 0; transition: none !important; }
          .rvknot-name { animation: none; opacity: 1; transition: none !important; }
        }
      `}</style>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full" role="img">
        <defs>
          <radialGradient id="rvknot-heart-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f1ece0" stopOpacity="0.12" />
            <stop offset="55%" stopColor="#f1ece0" stopOpacity="0.045" />
            <stop offset="100%" stopColor="#f1ece0" stopOpacity="0" />
          </radialGradient>
          <filter id="rvknot-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={KNOT_X} cy={KNOT_Y} r={330} fill="url(#rvknot-heart-glow)" />
        {paintOrder.map((thread, paintIndex) => {
          const isCenter = thread.group === 'center';
          const offset = threadOffset(thread.rowIndex, thread.rowCount, thread.person.id);
          const startY = isCenter
            ? centerRowY(thread.rowIndex, thread.rowCount)
            : sideRowY(thread.rowIndex, thread.rowCount);
          const startDx = arcDx(startY);
          const label = truncateName(thread.person.name, isCenter ? centerChars : sideChars);
          const path = isCenter
            ? buildHeartThreadPath(
                thread.person.id,
                startY,
                thread.rowIndex % 2 === 0 ? -1 : 1,
                centerLaneById.get(thread.person.id) ?? CENTER_LANE_MAX,
                halfNameWidth(label, centerFontSize),
                offset,
              )
            : buildBoughThreadPath(
                thread.group as 'left' | 'right',
                thread.person.id,
                startY,
                startDx,
                lerp(
                  TRUNK_JOIN_TOP,
                  TRUNK_JOIN_BOTTOM,
                  clamp01((startY - ARC_TOP_Y) / (ARC_BOTTOM_Y - ARC_TOP_Y)),
                ),
                BOUGH_RAIL_DX + createSeededRandom(`${thread.person.id}::rail`)() * 16,
                offset,
              );
          const color = pickThreadColor(thread.person.side, thread.person.id);
          const delay = `${(entrance === 'staggered' ? 0.25 + paintIndex * 0.035 : 0.12).toFixed(2)}s`;
          const fontSize = isCenter ? centerFontSize : sideFontSize;
          const dir = thread.group === 'left' ? -1 : 1;
          const nameTransform = isCenter
            ? `translate(${KNOT_X} ${startY + fontSize * 0.34})`
            : `translate(${KNOT_X + dir * (startDx + NAME_GAP)} ${startY + fontSize * 0.34})`;
          return (
            <g key={thread.person.id}>
              <path
                d={path}
                pathLength={1}
                className="rvknot-thread"
                style={{ animationDelay: delay, transition: REWEAVE_TRANSITION }}
                fill="none"
                stroke={PAGE_BLACK}
                strokeWidth={5.4}
                strokeLinecap="round"
              />
              <path
                d={path}
                pathLength={1}
                className="rvknot-thread"
                style={{ animationDelay: delay, transition: REWEAVE_TRANSITION }}
                fill="none"
                stroke={color}
                strokeWidth={isCenter ? 2.3 : 2.05}
                strokeOpacity={0.92}
                strokeLinecap="round"
              />
              <text
                transform={nameTransform}
                textAnchor={isCenter ? 'middle' : thread.group === 'left' ? 'end' : 'start'}
                className={`${playfair.className} rvknot-name`}
                style={{
                  animationDelay: delay,
                  transition: 'transform 900ms ease, font-size 900ms ease',
                }}
                fontSize={fontSize}
                fill={color}
                opacity={0.95}
              >
                {thread.person.hovertext ? <title>{thread.person.hovertext}</title> : null}
                {label}
              </text>
            </g>
          );
        })}
        {/* The couple: heavier founding threads that tie the knot even before
            the first RSVP. They stand together at the crown with the friends
            they share gathered just beneath. Painted last, atop the cord. */}
        {FOUNDERS.map((founder) => {
          const dir = founder.column === 'left' ? -1 : 1;
          const path = buildBoughThreadPath(
            founder.column,
            founder.id,
            FOUNDER_Y + 32,
            FOUNDER_START_DX,
            TRUNK_JOIN_TOP - 40,
            FOUNDER_RAIL_DX,
            0,
          );
          return (
            <g key={founder.id}>
              <path
                d={path}
                pathLength={1}
                className="rvknot-thread"
                style={{ animationDelay: '0s' }}
                fill="none"
                stroke={PAGE_BLACK}
                strokeWidth={6.4}
                strokeLinecap="round"
              />
              <path
                d={path}
                pathLength={1}
                className="rvknot-thread"
                style={{ animationDelay: '0s' }}
                fill="none"
                stroke={founder.color}
                strokeWidth={3.3}
                strokeOpacity={0.98}
                strokeLinecap="round"
                filter="url(#rvknot-soft-glow)"
              />
              <text
                transform={`translate(${KNOT_X + dir * FOUNDER_NAME_GAP} ${FOUNDER_Y})`}
                textAnchor={founder.column === 'left' ? 'end' : 'start'}
                className={`${playfair.className} rvknot-name`}
                style={{ animationDelay: '0.2s' }}
                fontSize={28}
                fontStyle="italic"
                fill={founder.color}
                filter="url(#rvknot-soft-glow)"
              >
                {founder.name}
              </text>
            </g>
          );
        })}
        {/* The ampersand belongs at the crown between them, not in the knot —
            the crossing of the cord already says it down there. */}
        <text
          x={KNOT_X}
          y={FOUNDER_Y - 1}
          textAnchor="middle"
          className={playfair.className}
          fontSize={20}
          fontStyle="italic"
          fill={NAME_INK}
          opacity={0.7}
        >
          &amp;
        </text>
      </svg>
    </div>
  );
};

export default KnotTapestry;
