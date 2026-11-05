import { clamp } from "es-toolkit";
import type { SpawnFrame } from "./particles";
import type { AuraSilhouette } from "./silhouette";

/** Where one frame of an aura goes. */
export interface AuraPlacement {
  silhouette: AuraSilhouette;
  /** Screen position of the unpadded silhouette's top-left. */
  x: number;
  y: number;
  /** Particle space minus screen space: the camera for characters, 0 for tooltips. */
  viewX: number;
  viewY: number;
  /** Ground under the feet; tooltips have none. */
  ground: boolean;
  /** Bottom centre of the silhouette on screen. */
  feetX: number;
  feetY: number;
}

/** Radius of the ground piece round the feet, px. */
export function groundRadius(place: AuraPlacement): number {
  return Math.round(clamp(place.silhouette.bounds.w * 0.7, 14, 30));
}

/** The particle field's spawn frame for an aura at `place`. */
export function spawnFrame(place: AuraPlacement): SpawnFrame {
  const { silhouette } = place;
  const ox = place.x + place.viewX;
  const oy = place.y + place.viewY;
  const rx = groundRadius(place);

  return {
    edge: silhouette.edge,
    ox,
    oy,
    feet: {
      x: place.feetX + place.viewX,
      y: place.feetY + place.viewY - 2,
      rx,
      ry: rx * 0.36,
    },
    body: {
      x: ox + silhouette.bounds.x,
      y: oy + silhouette.bounds.y,
      w: silhouette.bounds.w,
      h: silhouette.bounds.h,
    },
    center: {
      x: ox + silhouette.bounds.x + silhouette.bounds.w / 2,
      y: oy + silhouette.bounds.y + silhouette.bounds.h * 0.45,
    },
    ground: place.ground,
    motion: { vx: 0, vy: 0 },
  };
}
