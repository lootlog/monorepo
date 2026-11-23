import motionTheme from "@/motion.css?raw";

const readMotionToken = (name: string): string => {
  const value = new RegExp(`--${name}:\\s*([^;]+);`).exec(motionTheme)?.[1];

  if (value === undefined) throw new Error(`Missing motion token --${name}`);

  return value.trim();
};

const readMotionDurationMs = (name: string): number => {
  const value = readMotionToken(name);

  if (!value.endsWith("ms"))
    throw new Error(`Motion token --${name} is not in milliseconds`);

  return Number.parseFloat(value);
};

export const MOTION_DURATION_MS = {
  short: readMotionDurationMs("transition-duration-short"),
  medium: readMotionDurationMs("transition-duration-medium"),
  long: readMotionDurationMs("transition-duration-long"),
};

export const MOTION_EASING = {
  enter: readMotionToken("ease-enter"),
  exit: readMotionToken("ease-exit"),
};
