import { User } from "lucide-react";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { useTimerMapPresence } from "./timer-map-presence-provider";

export function TimerMapPresenceIndicator({
  timer,
}: {
  timer: TimerWithTimeLeft;
}) {
  const { t } = useTranslation("timers");
  const occupancy = useTimerMapPresence(timer);

  if (!occupancy) return null;
  const label = t(occupancy.allAfk ? "tooltip.mapAfk" : "tooltip.mapOccupied");

  // Sized in `em` to follow the timer font size; the negative block margin
  // keeps it out of the line height so tiles do not grow when it appears.
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "ll:relative ll:-top-px ll:-my-[0.25em] ll:mr-[3px] ll:inline-block ll:size-[1em] ll:align-middle ll:drop-shadow-[0_1px_1px_rgb(0_0_0/0.8)]",
        occupancy.allAfk ? "ll:text-orange-400" : "ll:text-green-400",
      )}
    >
      <User aria-hidden strokeWidth={3} className="ll:block ll:size-full" />
    </span>
  );
}
