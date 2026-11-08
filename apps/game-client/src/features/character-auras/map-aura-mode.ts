import type { MapAuraMode } from "@lootlog/schema/character-aura";

/** How many other characters' auras the `nearby` mode draws beside the hero's. */
export const NEARBY_AURA_LIMIT = 2;

let accelerated: boolean | null = null;

/**
 * Whether the browser draws with the GPU. Without it every aura copied onto
 * the map each frame is blended by the CPU, the cost that grows with each
 * aura shown. A WebGL context that would fall back to software is refused.
 */
function hasGraphicsAcceleration(): boolean {
  if (accelerated !== null) return accelerated;

  const context = document
    .createElement("canvas")
    .getContext("webgl", { failIfMajorPerformanceCaveat: true });

  accelerated = context !== null;
  context?.getExtension("WEBGL_lose_context")?.loseContext();

  return accelerated;
}

/** The mode a device draws auras in, with `auto` settled for this browser. */
export function resolveMapAuraMode(
  mode: MapAuraMode,
): Exclude<MapAuraMode, "auto"> {
  if (mode !== "auto") return mode;

  return hasGraphicsAcceleration() ? "all" : "nearby";
}
