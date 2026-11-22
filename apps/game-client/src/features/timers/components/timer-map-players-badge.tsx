import { cn } from "cn";

type TimerMapPlayersBadgeProps = {
  tone: "ally" | "enemy";
  count: number;
  active: boolean;
  stale?: boolean;
  label?: string;
};

const MAX_COUNT = 99;

const TONE_CLASS_NAMES = {
  ally: "ll:text-green-400",
  enemy: "ll:text-red-400",
};

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
