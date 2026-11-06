import { HOURS, MIN_ROW_HEIGHT } from "./constants";
import type { ReservationRange } from "./types";
import { EASE_EMPHASIZED_CSS, MOTION_DURATION } from "@/lib/motion";

export type DaySelection = {
  anchorMinutes: number;
  currentMinutes: number;
  dragged: boolean;
  input: "mouse" | "touch";
};

export type TouchSession = {
  activated: boolean;
  canceled: boolean;
  identifier: number;
  latestClientX: number;
  latestClientY: number;
  /** Recent horizontal positions, for the release velocity. */
  samples: SwipeSample[];
  startClientX: number;
  startClientY: number;
  swiping: boolean;
};

type SwipeSample = { clientX: number; time: number };

export const LONG_PRESS_DURATION_MS = 350;

export const TOUCH_MOVE_TOLERANCE_PX = 8;

export const SWIPE_DRAG_THRESHOLD_PX = 10;

/** How far back the release velocity looks, so a closing flick counts. */
const SWIPE_VELOCITY_WINDOW_MS = 100;

export const SWIPE_COMMIT_TIMING = {
  duration: MOTION_DURATION.medium * 1000,
  easing: EASE_EMPHASIZED_CSS,
} as const;

export const SWIPE_RETURN_TIMING = {
  duration: MOTION_DURATION.short * 1000,
  easing: EASE_EMPHASIZED_CSS,
} as const;

export const addSwipeSample = (
  session: TouchSession,
  clientX: number,
  time: number,
) => {
  session.samples.push({ clientX, time });

  while (
    session.samples.length > 2 &&
    time - (session.samples[0]?.time ?? time) > SWIPE_VELOCITY_WINDOW_MS
  ) {
    session.samples.shift();
  }
};

/** The release velocity in px/s over the last moments of the gesture. */
export const getSwipeVelocity = (
  session: TouchSession,
  clientX: number,
  time: number,
): number => {
  const sample = session.samples[0];

  if (!sample) return 0;
  const elapsedMilliseconds = Math.max(1, time - sample.time);

  return ((clientX - sample.clientX) / elapsedMilliseconds) * 1000;
};

export const getMinutesFromClientY = (
  grid: HTMLDivElement,
  clientY: number,
  minuteStep: number,
): number | null => {
  const y = clientY - grid.getBoundingClientRect().top;

  if (y < 0 || y > HOURS.length * MIN_ROW_HEIGHT) return null;
  const rawMinutes = (y / MIN_ROW_HEIGHT) * 60;

  return Math.min(
    24 * 60 - minuteStep,
    Math.floor(rawMinutes / minuteStep) * minuteStep,
  );
};

export const getDateAtMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setHours(0, minutes, 0, 0);

  return result;
};

export const getSelectedRange = (
  date: Date,
  selection: DaySelection,
  defaultDurationMinutes: number,
  minuteStep: number,
): ReservationRange => {
  const startMinutes = Math.min(
    selection.anchorMinutes,
    selection.currentMinutes,
  );

  const endMinutes = selection.dragged
    ? Math.max(selection.anchorMinutes, selection.currentMinutes) + minuteStep
    : startMinutes + defaultDurationMinutes;

  return {
    startsAt: getDateAtMinutes(date, startMinutes),
    endsAt: getDateAtMinutes(date, endMinutes),
  };
};

export const isReservationTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(".reservation-card") !== null;
