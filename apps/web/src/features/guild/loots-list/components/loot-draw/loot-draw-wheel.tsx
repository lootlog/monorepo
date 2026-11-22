import { lootDrawLandingOffset } from "@lootlog/domain/loot-draw";
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { cn } from "cn";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { lootDrawSegmentColor } from "./loot-draw-colors";

const SIZE = 240;

const CENTER = SIZE / 2;

/** The rim's width; slices fill the circle inside it. */
const RIM = 7;

const RADIUS = SIZE / 2 - RIM - 2;

/** Full turns before the wheel settles, so a spin reads as a spin. */
const SPIN_TURNS = 7;

const SPIN_MS = 6500;

/** Past its stop the wheel drifts this far, then rolls back onto it. */
const OVERSHOOT_DEGREES = 5;

/** The share of the spin spent before the drift back begins. */
const OVERSHOOT_AT = 0.88;

/** More slices than this and the rim's pegs would merge into a band. */
const MAX_PEGS = 48;

/** Names run along the radius from the rim, at most this size. */
const MAX_FONT_SIZE = 13;

const MIN_FONT_SIZE = 8;

/** The smallest size a long name shrinks to before it is cut. */
const READABLE_FONT_SIZE = 9.5;

/** Room left between a name and the rim, and around the hub. */
const RIM_GAP = 8;

const HUB_RADIUS = 20;

/** A semibold name's average glyph width, as a share of its font size. */
const GLYPH_WIDTH = 0.6;

type WheelEntrant = { name: string };

const pointAt = (angle: number, radius = RADIUS) => {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  };
};

const segmentPath = (from: number, to: number) => {
  if (to - from >= 360) {
    return `M ${CENTER} ${CENTER - RADIUS} A ${RADIUS} ${RADIUS} 0 1 1 ${CENTER - 0.01} ${CENTER - RADIUS} Z`;
  }

  const start = pointAt(from);
  const end = pointAt(to);
  const largeArc = to - from > 180 ? 1 : 0;

  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
};

/**
 * A slice's name laid along its radius, as a wheel of names writes them: the
 * font fits the slice's width, and the name stops where neighbouring slices
 * get too narrow to hold it. Null when the slice is too thin for any name;
 * the legend still lists it.
 */
const radialLabel = (name: string, from: number, to: number) => {
  const sweep = ((to - from) * Math.PI) / 180;
  const widest = Math.min(MAX_FONT_SIZE, sweep * (RADIUS * 0.8) * 0.75);

  // How many characters fit along the radius at a font size: closer to the
  // hub the slice narrows below the font height.
  const capacity = (fontSize: number) =>
    Math.floor(
      (RADIUS - RIM_GAP - Math.max(HUB_RADIUS, fontSize / sweep)) /
        (fontSize * GLYPH_WIDTH),
    );

  // A long name first gets a smaller font, and is cut only below the floor.
  let fontSize = widest;

  while (
    fontSize - 0.5 >= READABLE_FONT_SIZE &&
    capacity(fontSize) < name.length
  ) {
    fontSize -= 0.5;
  }

  if (fontSize < MIN_FONT_SIZE) return null;

  const maxChars = capacity(fontSize);

  if (maxChars < 3) return null;

  const text =
    name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name;

  const middle = (from + to) / 2;
  const anchor = pointAt(middle, RADIUS - RIM_GAP);
  // Names on the left half turn over, so none reads upside down.
  const flipped = middle > 180;

  return {
    text,
    fontSize,
    x: anchor.x,
    y: anchor.y,
    rotation: flipped ? middle + 90 : middle - 90,
    textAnchor: flipped ? ("start" as const) : ("end" as const),
  };
};

/**
 * A wheel with a slice per run of one entrant's tickets in `ticketOrder`, so
 * a shuffled order mixes the slices, and the pointer at the top. Given
 * `roll`, a position in that order, it turns until that ticket sits under
 * the pointer: spinning when `spin` is set, or already settled otherwise.
 * The pointer stops where `drawId` places it inside the ticket, often close
 * to a neighbour; the spin runs a little past it and rolls back. Once at
 * rest, the winner's slice stays lit and the others dim.
 */
export const LootDrawWheel = ({
  entrants,
  ticketOrder,
  roll,
  drawId,
  spin = false,
  onSettled,
  className,
}: {
  entrants: readonly WheelEntrant[];
  ticketOrder: readonly number[];
  roll: number | null;
  /** Fixes where in the winning ticket the pointer stops. */
  drawId?: number;
  spin?: boolean;
  /** Called once a spin rests on the result; a wheel shown at rest never spins. */
  onSettled?: () => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const shineId = useId();
  const wheelRef = useRef<SVGSVGElement>(null);
  const total = ticketOrder.length;
  const animate = spin && !reducedMotion;
  // A wheel shown at rest is settled; a spinning one, once its spin ends.
  const [spinEnded, setSpinEnded] = useState(false);
  const rested = !animate || spinEnded;
  const landing = drawId === undefined ? 0.5 : lootDrawLandingOffset(drawId);

  const settled =
    roll === null || total === 0
      ? 0
      : SPIN_TURNS * 360 - ((roll + landing) / total) * 360;

  const winnerIndex = roll === null ? null : (ticketOrder[roll] ?? null);

  const settle = useEffectEvent(() => {
    setSpinEnded(true);
    onSettled?.();
  });

  useEffect(() => {
    if (!animate) return;

    // The keyframes take the wheel past its stop and back; the style below
    // holds the stop once they end.
    const animation = wheelRef.current?.animate(
      [
        {
          transform: "rotate(0deg)",
          easing: "cubic-bezier(0.12, 0.6, 0.08, 1)",
        },
        {
          transform: `rotate(${settled + OVERSHOOT_DEGREES}deg)`,
          offset: OVERSHOOT_AT,
          easing: "cubic-bezier(0.45, 0, 0.3, 1)",
        },
        { transform: `rotate(${settled}deg)` },
      ],
      { duration: SPIN_MS },
    );

    const done = setTimeout(settle, SPIN_MS);

    return () => {
      animation?.cancel();
      clearTimeout(done);
    };
  }, [animate, settled]);

  // Neighbouring tickets of one entrant share a slice.
  const runs = ticketOrder.reduce<
    { index: number; start: number; end: number }[]
  >((all, index, position) => {
    const last = all[all.length - 1];

    if (last && last.index === index) {
      last.end = position + 1;
    } else {
      all.push({ index, start: position, end: position + 1 });
    }

    return all;
  }, []);

  const segments = runs.flatMap(({ index, start, end }) => {
    const entrant = entrants[index];

    if (!entrant) return [];

    const from = (start / total) * 360;
    const to = (end / total) * 360;
    const label = radialLabel(entrant.name, from, to);

    return [{ index, from, to, label, start }];
  });

  const dimmed = (index: number) =>
    rested && winnerIndex !== null && index !== winnerIndex;

  return (
    <div
      role="img"
      aria-label={t("loots.details.draw.wheelLabel", {
        entrants: entrants.map(({ name }) => name).join(", "),
      })}
      className={cn(
        "relative mx-auto aspect-square w-full max-w-80",
        className,
      )}
    >
      <svg
        ref={wheelRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-full drop-shadow-md"
        style={{ transform: `rotate(${settled}deg)` }}
      >
        <defs>
          <radialGradient id={shineId} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="white" stopOpacity={0.22} />
            <stop offset="55%" stopColor="white" stopOpacity={0.04} />
            <stop offset="100%" stopColor="black" stopOpacity={0.18} />
          </radialGradient>
        </defs>
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS + RIM / 2}
          fill="none"
          stroke="var(--border)"
          strokeWidth={RIM}
        />
        {segments.map(({ index, from, to, label, start }) => (
          <g
            key={start}
            className="transition-opacity duration-500 motion-reduce:transition-none"
            opacity={dimmed(index) ? 0.5 : 1}
          >
            <path
              d={segmentPath(from, to)}
              fill={lootDrawSegmentColor(index)}
              stroke="var(--background)"
              strokeWidth={segments.length > 1 ? 1.5 : 0}
            />
            {label && (
              <text
                x={label.x}
                y={label.y}
                transform={`rotate(${label.rotation} ${label.x} ${label.y})`}
                textAnchor={label.textAnchor}
                dominantBaseline="central"
                fontSize={label.fontSize}
                className="fill-white font-semibold"
                style={{
                  paintOrder: "stroke",
                  stroke: "rgb(0 0 0 / 0.55)",
                  strokeWidth: 2.5,
                  strokeLinejoin: "round",
                }}
              >
                {label.text}
              </text>
            )}
          </g>
        ))}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill={`url(#${shineId})`}
          pointerEvents="none"
        />
        {segments.length > 1 &&
          segments.length <= MAX_PEGS &&
          segments.map(({ from, start }) => {
            const peg = pointAt(from, RADIUS + RIM / 2);

            return (
              <circle
                key={`peg-${start}`}
                cx={peg.x}
                cy={peg.y}
                r={2}
                fill="var(--muted-foreground)"
              />
            );
          })}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={16}
          fill="var(--card)"
          stroke="var(--border)"
          strokeWidth={2}
        />
        <circle cx={CENTER} cy={CENTER} r={5} fill="var(--primary)" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 26"
        className="absolute left-1/2 top-0 w-6 -translate-x-1/2 -translate-y-2 drop-shadow-md"
      >
        <path
          d="M10 25 L2.5 9 A8 8 0 1 1 17.5 9 Z"
          fill="var(--foreground)"
          stroke="var(--background)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <circle cx={10} cy={8} r={2.5} fill="var(--background)" />
      </svg>
    </div>
  );
};
