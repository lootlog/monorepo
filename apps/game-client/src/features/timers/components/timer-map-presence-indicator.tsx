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

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="ll:pointer-events-none ll:absolute ll:right-[2px] ll:top-[2px] ll:z-10 ll:size-[3px] ll:rounded-full ll:bg-green-500"
    />
  );
}
