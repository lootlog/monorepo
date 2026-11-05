import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { cn } from "cn";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { lootDrawSegmentColor } from "./loot-draw-colors";

const SIZE = 240;

const RADIUS = SIZE / 2 - 4;

const CENTER = SIZE / 2;

/** Full turns before the wheel settles, so a spin reads as a spin. */
const SPIN_TURNS = 6;

const SPIN_MS = 4500;

/** Names run along the radius from the rim, at most this size. */
const MAX_FONT_SIZE = 11;

const MIN_FONT_SIZE = 7;

/** The smallest size a long name shrinks to before it is cut. */
const READABLE_FONT_SIZE = 8.5;

/** Room left between a name and the rim, and around the hub. */
const RIM_GAP = 9;

const HUB_RADIUS = 22;

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
 */
export const LootDrawWheel = ({
  entrants,
  ticketOrder,
  roll,
  spin = false,
  onSettled,
  className,
}: {
  entrants: readonly WheelEntrant[];
  ticketOrder: readonly number[];
  roll: number | null;
  spin?: boolean;
  /** Called once a spin rests on the result; a wheel shown at rest never spins. */
  onSettled?: () => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const total = ticketOrder.length;

  const settled =
    roll === null || total === 0
      ? 0
      : SPIN_TURNS * 360 - ((roll + 0.5) / total) * 360;

  const animate = spin && !reducedMotion;
  // A spin rests at 0 for its first frame, so the transition has a distance to run.
  const [hasStarted, setHasStarted] = useState(false);
  const rotation = animate && !hasStarted ? 0 : settled;

  useEffect(() => {
    if (!animate) return;

    const frame = requestAnimationFrame(() => setHasStarted(true));
    const done = setTimeout(() => onSettled?.(), SPIN_MS);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
    };
  }, [animate, onSettled]);

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

  return (
    <div
      role="img"
      aria-label={t("loots.details.draw.wheelLabel", {
        entrants: entrants.map(({ name }) => name).join(", "),
      })}
      className={cn(
        "relative mx-auto aspect-square w-full max-w-60",
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-full drop-shadow-sm"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: animate
            ? `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.7, 0.1, 1)`
            : undefined,
        }}
      >
        {segments.map(({ index, from, to, label, start }) => (
          <g key={start}>
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
        <circle cx={CENTER} cy={CENTER} r={14} fill="var(--background)" />
      </svg>
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 border-x-8 border-t-[14px] border-x-transparent border-t-foreground"
      />
    </div>
  );
};
