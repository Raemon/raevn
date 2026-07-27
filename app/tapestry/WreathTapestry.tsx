import { line, curveCatmullRom, curveCatmullRomClosed } from 'd3-shape';
import { playfair, cormorant } from '../handfasting-simple/save-the-date/handfastingInvitationTypography';
import { PAGE_BLACK, NAME_INK, FAINT_INK, pickThreadColor, truncateName } from './tapestryPalette';
import { orderPersonsForTapestry } from './tapestryOrdering';
import { createSeededRandom, hashStringToSeed } from './tapestrySeededRandom';
import type { TapestryEntrance, TapestryPerson } from './tapestryTypes';

// A braided circlet: each guest is one strand woven around the ring, arcing
// over and under their neighbours' strands, with names radiating from the rim
// and the couple held at the centre. Ray's people braid the right of the
// circle, Elizabeth's the left, shared friends across the crown seams.
//
// Two founding rings — one silver, one gold — circle the wreath before anyone
// has RSVP'd: the couple's own bands, interlocking six times around. Strand
// positions depend on the guest count, so paths carry a CSS `d` transition
// and the circlet re-braids itself as each new arrival is worked in.
const VIEW_SIZE = 1000;
const CENTER = VIEW_SIZE / 2;
const RING_RADIUS = 296;
const WEAVE_AMPLITUDE = 24;
const NAME_RADIUS = RING_RADIUS + 58;
const ARC_SAMPLES = 36;
const REWEAVE_TRANSITION = 'd 900ms ease';

type Point = { x: number; y: number };

const strandPath = line<Point>()
  .x((p) => p.x)
  .y((p) => p.y)
  .curve(curveCatmullRom.alpha(0.5));

const founderRingPath = line<Point>()
  .x((p) => p.x)
  .y((p) => p.y)
  .curve(curveCatmullRomClosed.alpha(0.5));

const polar = (theta: number, radius: number): Point => ({
  x: CENTER + radius * Math.cos(theta),
  y: CENTER + radius * Math.sin(theta),
});

// The couple's bands: full circles whose radius breathes in opposite phase,
// so silver and gold cross each other six times around the wreath.
const FOUNDER_RINGS = [
  { id: 'founder-elizabeth', color: '#cdd9e9', phase: 0 },
  { id: 'founder-ray', color: '#d9848f', phase: Math.PI },
].map((ring) => {
  const points: Point[] = [];
  for (let i = 0; i < 72; i++) {
    const theta = (i / 72) * Math.PI * 2;
    points.push(polar(theta, RING_RADIUS + WEAVE_AMPLITUDE * 0.6 * Math.sin(3 * theta + ring.phase)));
  }
  return { ...ring, path: founderRingPath(points) ?? '' };
});

const WreathTapestry = ({
  persons,
  entrance = 'staggered',
}: {
  persons: TapestryPerson[];
  entrance?: TapestryEntrance;
}) => {
  const ordered = orderPersonsForTapestry(persons);
  const count = ordered.length;
  const slotAngle = count > 0 ? (2 * Math.PI) / count : 0;

  const strands = ordered.map((person, index) => {
    const random = createSeededRandom(`${person.id}::wreath`);
    // Start at the top and run clockwise: elizabeth → both → ray, so the two
    // sides mirror each other around the vertical axis.
    const theta = -Math.PI / 2 + (index + 0.5) * slotAngle;
    // Long overlapping arcs (each spanning many neighbours) are what make the
    // ring read as a weave instead of a dashed circle.
    const halfSpan = Math.min(1.15, Math.max(0.42, (5.5 + random() * 4) * slotAngle));
    const wavePhase = random() * Math.PI * 2;
    const waveTurns = 2 + Math.round(random() * 2);
    const points: Point[] = [];
    for (let i = 0; i <= ARC_SAMPLES; i++) {
      const t = i / ARC_SAMPLES;
      const phi = theta - halfSpan + t * halfSpan * 2;
      // Taper the oscillation at both ends so strands sink into the braid
      // instead of stopping mid-air.
      const endTaper = Math.min(1, Math.min(t, 1 - t) / 0.18);
      const radius =
        RING_RADIUS +
        WEAVE_AMPLITUDE * endTaper * Math.sin(wavePhase + t * waveTurns * Math.PI * 2);
      points.push(polar(phi, radius));
    }
    return { person, index, theta, path: strandPath(points) ?? '' };
  });

  // Paint order varies which strand lies on top at each crossing (the weave),
  // but it must be STABLE per person: anything count-dependent would reorder
  // DOM nodes on every new arrival, and a moved node restarts its CSS
  // draw-in animation.
  const dedupedPaintOrder = [...strands].sort(
    (a, b) => hashStringToSeed(a.person.id) - hashStringToSeed(b.person.id),
  );

  const nameFontSize =
    count > 0 ? Math.max(10.5, Math.min(16, slotAngle * RING_RADIUS * 0.46)) : 16;
  const tickLength = NAME_RADIUS - 10 - (RING_RADIUS + WEAVE_AMPLITUDE + 6);

  return (
    <div className="relative mx-auto w-full max-w-3xl select-none" aria-label="Woven wreath of confirmed guests">
      <style>{`
        .rvwreath-strand {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: rvwreathDraw 2.1s cubic-bezier(0.4, 0, 0.3, 1) forwards;
        }
        .rvwreath-name {
          opacity: 0;
          animation: rvwreathFade 1.3s ease forwards;
        }
        @keyframes rvwreathDraw { to { stroke-dashoffset: 0; } }
        @keyframes rvwreathFade { to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .rvwreath-strand { animation: none; stroke-dashoffset: 0; transition: none !important; }
          .rvwreath-name { animation: none; opacity: 1; transition: none !important; }
        }
      `}</style>
      <svg viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} className="h-auto w-full" role="img">
        <defs>
          <radialGradient id="rvwreath-center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f1ece0" stopOpacity="0.1" />
            <stop offset="70%" stopColor="#f1ece0" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#f1ece0" stopOpacity="0" />
          </radialGradient>
          <filter id="rvwreath-soft-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={CENTER} cy={CENTER} r={RING_RADIUS - 40} fill="url(#rvwreath-center-glow)" />
        {FOUNDER_RINGS.map((ring) => (
          <g key={ring.id}>
            <path
              d={ring.path}
              pathLength={1}
              className="rvwreath-strand"
              style={{ animationDelay: '0s' }}
              fill="none"
              stroke={PAGE_BLACK}
              strokeWidth={6.2}
              strokeLinecap="round"
            />
            <path
              d={ring.path}
              pathLength={1}
              className="rvwreath-strand"
              style={{ animationDelay: '0s' }}
              fill="none"
              stroke={ring.color}
              strokeWidth={3}
              strokeOpacity={0.96}
              strokeLinecap="round"
              filter="url(#rvwreath-soft-glow)"
            />
          </g>
        ))}
        {dedupedPaintOrder.map((strand) => {
          const color = pickThreadColor(strand.person.side, strand.person.id);
          const delay = `${(entrance === 'staggered'
            ? 0.15 + (strand.index / Math.max(count, 1)) * 1.6
            : 0.12
          ).toFixed(2)}s`;
          const thetaDeg = (strand.theta * 180) / Math.PI;
          const flip = Math.cos(strand.theta) < 0;
          const labelPoint = polar(strand.theta, NAME_RADIUS);
          const tickInner = polar(strand.theta, RING_RADIUS + WEAVE_AMPLITUDE + 6);
          return (
            <g key={strand.person.id}>
              <path
                d={strand.path}
                pathLength={1}
                className="rvwreath-strand"
                style={{ animationDelay: delay, transition: REWEAVE_TRANSITION }}
                fill="none"
                stroke={PAGE_BLACK}
                strokeWidth={5.2}
                strokeLinecap="round"
              />
              <path
                d={strand.path}
                pathLength={1}
                className="rvwreath-strand"
                style={{ animationDelay: delay, transition: REWEAVE_TRANSITION }}
                fill="none"
                stroke={color}
                strokeWidth={2.1}
                strokeOpacity={0.92}
                strokeLinecap="round"
              />
              <g
                transform={`translate(${tickInner.x} ${tickInner.y}) rotate(${thetaDeg})`}
                className="rvwreath-name"
                style={{ animationDelay: delay, transition: 'transform 900ms ease' }}
              >
                <line x1={0} y1={0} x2={tickLength} y2={0} stroke={color} strokeOpacity={0.35} strokeWidth={1} />
              </g>
              <text
                transform={`translate(${labelPoint.x} ${labelPoint.y}) rotate(${
                  flip ? thetaDeg + 180 : thetaDeg
                })`}
                textAnchor={flip ? 'end' : 'start'}
                dominantBaseline="middle"
                className={`${playfair.className} rvwreath-name`}
                style={{
                  animationDelay: delay,
                  transition: 'transform 900ms ease, font-size 900ms ease',
                }}
                fontSize={nameFontSize}
                fill={color}
                opacity={0.95}
              >
                {strand.person.hovertext ? <title>{strand.person.hovertext}</title> : null}
                {truncateName(strand.person.name, 17)}
              </text>
            </g>
          );
        })}
        <text
          x={CENTER}
          y={CENTER - 14}
          textAnchor="middle"
          className={playfair.className}
          fontSize={46}
          fontStyle="italic"
          fill={NAME_INK}
        >
          Ray &amp; Elizabeth
        </text>
        <text
          x={CENTER}
          y={CENTER + 38}
          textAnchor="middle"
          className={cormorant.className}
          fontSize={21}
          fontStyle="italic"
          letterSpacing="0.16em"
          fill={FAINT_INK}
        >
          10 years &amp; 10 days
        </text>
      </svg>
    </div>
  );
};

export default WreathTapestry;
