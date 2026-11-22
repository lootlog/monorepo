import type { MapAuraMode } from "@lootlog/schema/character-aura";

export const NEARBY_AURA_LIMIT = 2;

let accelerated: boolean | null = null;

export function hasGraphicsAcceleration(): boolean {
  if (accelerated !== null) return accelerated;

  const context = document
    .createElement("canvas")
    .getContext("webgl", { failIfMajorPerformanceCaveat: true });

  accelerated = context !== null;
  context?.getExtension("WEBGL_lose_context")?.loseContext();

  return accelerated;
}

export function resolveMapAuraMode(
  mode: MapAuraMode,
): Exclude<MapAuraMode, "auto"> {
  if (mode !== "auto") return mode;

  return hasGraphicsAcceleration() ? "all" : "nearby";
}
