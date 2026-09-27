import { User } from "lucide-react";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { useTimerMapThreat } from "./timer-map-presence-provider";

export function TimerMapThreatIndicator({
  timer,
}: {
  timer: TimerWithTimeLeft;
}) {
  const { t } = useTranslation("timers");
  const threat = useTimerMapThreat(timer);

  if (!threat) return null;
  const fresh = threat.freshCount > 0;
  const count = fresh ? threat.freshCount : threat.enemies.length;

  // A filled figure means an active enemy; an outline means every current one is AFK.
  const active = threat.enemies
    .slice(0, threat.freshCount)
    .some((enemy) => !enemy.stasis);

  const label = t(fresh ? "tooltip.mapThreat" : "tooltip.mapThreatStale", {
    count,
  });

  // The count needs room the label would otherwise lose; `timer-tile` is the tile's container.
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "ll:relative ll:-top-px ll:-my-[0.25em] ll:mr-[3px] ll:inline-flex ll:items-center ll:align-middle ll:text-red-500 ll:drop-shadow-[0_1px_1px_rgb(0_0_0/0.8)]",
        { "ll:opacity-50": !fresh },
      )}
    >
      <User
        aria-hidden
        strokeWidth={3}
        fill={active ? "currentColor" : "none"}
        className="ll:block ll:size-[1em]"
      />
      <span
        aria-hidden
        className="ll:hidden ll:text-[0.85em] ll:leading-none ll:@min-[11em]/timer-tile:inline"
      >
        {count}
      </span>
    </span>
  );
}
