/**
 * The effects an aura can lay over the whole map while its admin is on it, by the kind a
 * preset names in `sky`.
 */
import { drawPowerField, POWER_GLOOM, POWER_VEIL } from "./ascend";
import { drawTimeStop } from "./chrono";
import { COSMOS_GLOOM, drawCosmosSky } from "./cosmos";
import { drawWireframe, WIREFRAME_GLOOM, WIREFRAME_VEIL } from "./glitch";
import type { Rgb } from "./math";
import type { MapEffectKind } from "./presets";
import type { MapScene } from "./sky";
import { drawStorm, STORM_GLOOM } from "./storm";
import { BLIZZARD_GLOOM, BLIZZARD_VEIL, drawBlizzard } from "./winter";

export interface MapEffect {
  /** How much it dims the map all the time, 0..1; an effect only seen in bursts has none. */
  gloom: number;
  /** What the map is dimmed with, where a surface can only lay a flat veil over it. */
  veil: Rgb;
  draw: (scene: MapScene) => void;
}

/** The dark of a night or a storm. */
const DARK: Rgb = [4, 2, 10];

export const MAP_EFFECTS: Record<MapEffectKind, MapEffect> = {
  storm: {
    gloom: STORM_GLOOM,
    veil: DARK,
    draw: ({ ctx, width, height, time, view, light, mid }) =>
      drawStorm(ctx, width, height, time, view, light, mid),
  },
  cosmos: { gloom: COSMOS_GLOOM, veil: DARK, draw: drawCosmosSky },
  blizzard: { gloom: BLIZZARD_GLOOM, veil: BLIZZARD_VEIL, draw: drawBlizzard },
  timestop: { gloom: 0, veil: DARK, draw: drawTimeStop },
  power: { gloom: POWER_GLOOM, veil: POWER_VEIL, draw: drawPowerField },
  wireframe: {
    gloom: WIREFRAME_GLOOM,
    veil: WIREFRAME_VEIL,
    draw: drawWireframe,
  },
};
