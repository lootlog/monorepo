import type { MotionValue } from "framer-motion";
import { HOURS, MIN_ROW_HEIGHT } from "./constants";
import type { ReservationRange } from "./types";
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
  startedAt: number;
  startClientX: number;
  startClientY: number;
  swiping: boolean;
};
export const LONG_PRESS_DURATION_MS = 350;
export const TOUCH_MOVE_TOLERANCE_PX = 8;
export const SWIPE_DRAG_THRESHOLD_PX = 10;
export const SWIPE_COMMIT_TRANSITION = {
  duration: 0.18,
  ease: [0.16, 1, 0.3, 1],
} as const;
export const SWIPE_RETURN_TRANSITION = {
  duration: 0.16,
  ease: [0.16, 1, 0.3, 1],
} as const;
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
export const resetSwipePosition = (swipeX: MotionValue<number>) => {
  swipeX.stop();
  swipeX.set(0);
};
