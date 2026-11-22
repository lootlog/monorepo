import { clamp } from "es-toolkit";
import type { SpawnFrame } from "./particles";
import type { AuraSilhouette } from "./silhouette";

export interface AuraPlacement {
  silhouette: AuraSilhouette;
  x: number;
  y: number;
  viewX: number;
  viewY: number;
  ground: boolean;
  feetX: number;
  feetY: number;
}

export function groundRadius(place: AuraPlacement): number {
  return Math.round(clamp(place.silhouette.bounds.w * 0.7, 14, 30));
}

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
