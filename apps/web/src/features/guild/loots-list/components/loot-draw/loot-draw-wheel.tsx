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

/** Segments narrower than this carry no name; the legend still lists them. */
const MIN_LABEL_ANGLE = 22;

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

const shortName = (name: string) =>
  name.length > 12 ? `${name.slice(0, 11)}…` : name;

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
    const label = pointAt((from + to) / 2, RADIUS * 0.62);

    return [{ entrant, index, from, to, label, start }];
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
        {segments.map(({ entrant, index, from, to, label, start }) => (
          <g key={start}>
            <path
              d={segmentPath(from, to)}
              fill={lootDrawSegmentColor(index)}
              stroke="var(--background)"
              strokeWidth={segments.length > 1 ? 1.5 : 0}
            />
            {to - from >= MIN_LABEL_ANGLE && (
              <text
                x={label.x}
                y={label.y}
                transform={`rotate(${(from + to) / 2} ${label.x} ${label.y})`}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white text-[10px] font-semibold"
                style={{
                  paintOrder: "stroke",
                  stroke: "rgb(0 0 0 / 0.45)",
                  strokeWidth: 2,
                }}
              >
                {shortName(entrant.name)}
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
