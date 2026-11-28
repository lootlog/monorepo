import type { ReplayEvent } from "@lootlog/battle-processor/replay-timeline";

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const easeOutCubic = (value: number) => 1 - (1 - clamp01(value)) ** 3;

export const easeInOutQuad = (value: number) => {
  const t = clamp01(value);

  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
};

export const getEventProgress = (event: ReplayEvent, timeMs: number) =>
  clamp01((timeMs - event.tStart) / Math.max(1, event.tEnd - event.tStart));

export const createSeededRandom = (seedText: string) => {
  let seed = 2166136261;

  for (let index = 0; index < seedText.length; index += 1) {
    seed = Math.imul(seed ^ seedText.charCodeAt(index), 16777619);
  }

  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    seed ^= seed >>> 16;

    return (seed >>> 0) / 4294967296;
  };
};
