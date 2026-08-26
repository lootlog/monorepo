export type DaySwipeDirection = -1 | 1;

type DaySwipeGesture = {
  offsetX: number;
  velocityX: number;
  width: number;
};

const MAX_DISTANCE_THRESHOLD_PX = 64;
const MIN_DISTANCE_THRESHOLD_PX = 40;
const MIN_FLICK_DISTANCE_PX = 24;
const MIN_FLICK_VELOCITY_PX_PER_SECOND = 600;
const WIDTH_THRESHOLD_RATIO = 0.12;

const getDirection = (value: number): DaySwipeDirection | null => {
  if (value === 0) return null;
  return value < 0 ? 1 : -1;
};

export function getDaySwipeDirection({
  offsetX,
  velocityX,
  width,
}: DaySwipeGesture): DaySwipeDirection | null {
  if (width <= 0) return null;

  const absoluteOffset = Math.abs(offsetX);
  const distanceThreshold = Math.min(
    Math.max(width * WIDTH_THRESHOLD_RATIO, MIN_DISTANCE_THRESHOLD_PX),
    MAX_DISTANCE_THRESHOLD_PX,
  );
  if (absoluteOffset >= distanceThreshold) return getDirection(offsetX);

  if (
    absoluteOffset < MIN_FLICK_DISTANCE_PX ||
    Math.abs(velocityX) < MIN_FLICK_VELOCITY_PX_PER_SECOND
  ) {
    return null;
  }

  return getDirection(velocityX);
}
