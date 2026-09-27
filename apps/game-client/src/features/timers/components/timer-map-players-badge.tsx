import { cn } from "cn";

type TimerMapPlayersBadgeProps = {
  tone: "ally" | "enemy";
  count: number;
  /** Someone is not AFK; a count where everyone is AFK turns orange. */
  active: boolean;
  /** Every sighting is older than the fresh window. */
  stale?: boolean;
  /** Accessible name; without it the badge is decorative. */
  label?: string;
};

const MAX_COUNT = 99;

const TONE_CLASS_NAMES = {
  ally: "ll:text-green-400",
  enemy: "ll:text-red-400",
};

/**
 * How many players are on a timer's map. Colour tells the side, or orange
 * when everyone there is AFK; opacity tells whether the sighting is still
 * fresh.
 */
export function TimerMapPlayersBadge({
  tone,
  count,
  active,
  stale = false,
  label,
}: TimerMapPlayersBadgeProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "ll:font-bold ll:tabular-nums",
        active ? TONE_CLASS_NAMES[tone] : "ll:text-orange-400",
        stale && "ll:opacity-50",
      )}
    >
      {count > MAX_COUNT ? `${MAX_COUNT}+` : count}
    </span>
  );
}
