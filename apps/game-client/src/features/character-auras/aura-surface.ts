import type { RuntimeAuraCharacter } from "@/lib/margonem-runtime/adapters/aura-runtime-adapter";
import type { AuraPlacement } from "./engine/placement";

/** The map auras are drawn on and its camera: map pixels minus screen pixels. */
export type AuraView = {
  mapId?: number;
  camera: readonly [number, number];
};

/** One character's aura as the renderer hands it to a surface each frame. */
export interface SurfaceAura {
  /** The character's stacking order this frame. */
  readonly order: number;
  readonly place: AuraPlacement | null;
  /** Draw the part under or over the character; errors are already contained. */
  drawBack(context: CanvasRenderingContext2D): void;
  drawFront(context: CanvasRenderingContext2D): void;
}

/**
 * Where auras go: the NI game canvas or SI's map elements. The renderer owns
 * the auras, their targets and failures; a surface reads the characters and
 * shows the auras the renderer passes it in each frame.
 */
export interface AuraSurface {
  /** Whether the game draws characters this surface can follow. */
  isAvailable(): boolean;
  /** Calls `onFrame` once per frame until the returned stop; null when unavailable. */
  subscribeFrame(onFrame: () => void): (() => void) | null;
  /** The drawn map, or null while nothing of it shows. */
  getView(): AuraView | null;
  getHero(): RuntimeAuraCharacter | null;
  getOther(characterId: string): RuntimeAuraCharacter | null;
  /** Whether an aura at `place` shows at all in what `context` draws. */
  isInView(place: AuraPlacement, context: CanvasRenderingContext2D): boolean;
  /** Shows `aura` under the key this frame. */
  show(key: string, aura: SurfaceAura): void;
  /** Ends a frame: what was not shown in it goes away. */
  endFrame(): void;
  /** Drops what the surface keeps for a key. */
  forget(key: string): void;
  /** Drops everything, for when no aura is drawn. */
  clear(): void;
}
