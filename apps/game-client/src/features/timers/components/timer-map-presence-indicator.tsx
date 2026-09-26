import { User } from "lucide-react";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { useTimerMapPresence } from "./timer-map-presence-provider";

export function TimerMapPresenceIndicator({
  timer,
  label,
}: {
  timer: TimerWithTimeLeft;
  label: string;
}) {
  const occupied = useTimerMapPresence(timer);

  if (!occupied) return null;

  // Sized in `em` to follow the timer font size; the negative block margin
  // keeps it out of the line height so tiles do not grow when it appears.
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="ll:relative ll:-top-px ll:-my-[0.25em] ll:mr-[3px] ll:inline-block ll:size-[1em] ll:align-middle ll:text-green-400 ll:drop-shadow-[0_1px_1px_rgb(0_0_0/0.8)]"
    >
      <User aria-hidden strokeWidth={3} className="ll:block ll:size-full" />
    </span>
  );
}
