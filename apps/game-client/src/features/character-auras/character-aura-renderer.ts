import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import {
  auraRuntimeAdapter,
  type RuntimeAuraCharacter,
} from "@/lib/margonem-runtime/adapters/aura-runtime-adapter";
import {
  rendererRuntimeAdapter,
  type RuntimeDrawable,
} from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import { Aura, type AuraPlacement } from "./engine/render";
import { SilhouetteCache } from "./engine/silhouette";

/** The key of the hero among the drawn characters; others use their character id. */
export const HERO_AURA_KEY = "hero";

/** Consecutive failing frames (about two seconds) before the auras give up for the session. */
const MAX_FAILURES = 120;

/** Just under and just over the character in the draw order, between it and the next row. */
const ORDER_EPSILON = 0.001;

type DrawnAura = {
  aura: Aura;
  place: AuraPlacement | null;
  /** The character's draw order this frame. */
  order: number;
  back: RuntimeDrawable;
  front: RuntimeDrawable;
};

/**
 * Draws auras into the game canvas just under and over their characters,
 * once per game frame. Only characters with an aura cost any work: the hero
 * when it wears one and the others whose account shows one.
 */
class CharacterAuraRenderer {
  private targets: ReadonlyMap<string, CharacterAuraId> = new Map();
  private readonly drawn = new Map<string, DrawnAura>();
  private readonly silhouettes = new SilhouetteCache();
  private unsubscribe: (() => void) | null = null;
  private mapId: number | undefined;
  private last = 0;
  private failures = 0;
  private broken = false;

  /** Characters to draw an aura on, by `HERO_AURA_KEY` or character id. */
  setTargets(targets: ReadonlyMap<string, CharacterAuraId>): void {
    this.targets = targets;

    for (const key of this.drawn.keys()) {
      if (!targets.has(key)) this.drawn.delete(key);
    }

    if (targets.size === 0) {
      this.stop();

      return;
    }

    if (this.unsubscribe || this.broken) return;
    this.last = performance.now();
    this.unsubscribe = rendererRuntimeAdapter.subscribeDraw(this.onFrame);
  }

  private stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.drawn.clear();
  }

  private readonly onFrame = (): void => this.guard(() => this.drawFrame());

  // Errors never leave the game's frame loop or renderer. A passing one (a
  // map change, a sprite still loading) skips the frame; only a long unbroken
  // run, a game build the adapter no longer matches, turns the auras off.
  private guard(step: () => void): void {
    if (this.broken) return;

    try {
      step();
      this.failures = 0;
    } catch (error) {
      if (++this.failures < MAX_FAILURES) return;
      this.broken = true;
      this.stop();
      console.warn("[CharacterAuras] Drawing disabled after errors:", error);
    }
  }

  private drawFrame(): void {
    const now = performance.now();
    const dt = (now - this.last) / 1000;
    this.last = now;
    const view = auraRuntimeAdapter.getView();

    // Particles live in map pixels; a new map starts every aura over.
    if (view && view.mapId !== this.mapId) {
      this.mapId = view.mapId;
      this.drawn.clear();
    }

    for (const [key, auraId] of this.targets) {
      const character = view
        ? key === HERO_AURA_KEY
          ? auraRuntimeAdapter.getHero()
          : auraRuntimeAdapter.getOther(key)
        : null;

      const drawn = this.drawnAura(key, auraId, character);

      drawn.place =
        view && character ? this.placement(character, view.camera) : null;
      drawn.aura.update(dt, drawn.place, 1);

      if (!drawn.place) continue;
      rendererRuntimeAdapter.addDrawable(drawn.back);
      rendererRuntimeAdapter.addDrawable(drawn.front);
    }
  }

  private drawnAura(
    key: string,
    auraId: CharacterAuraId,
    character: RuntimeAuraCharacter | null,
  ): DrawnAura {
    const existing = this.drawn.get(key);

    if (existing) {
      existing.aura.setPreset(auraId);
      existing.order = character?.order ?? existing.order;

      return existing;
    }

    const drawn: DrawnAura = {
      aura: new Aura(auraId),
      place: null,
      order: character?.order ?? 0,
      back: {
        getAlwaysDraw: () => true,
        getOrder: () => drawn.order - ORDER_EPSILON,
        draw: (context) =>
          this.guard(() => {
            if (drawn.place) drawn.aura.drawBack(context, drawn.place, 1);
          }),
      },
      front: {
        getAlwaysDraw: () => true,
        getOrder: () => drawn.order + ORDER_EPSILON,
        draw: (context) =>
          this.guard(() => {
            if (drawn.place) drawn.aura.drawFront(context, drawn.place, 1);
          }),
      },
    };

    this.drawn.set(key, drawn);

    return drawn;
  }

  private placement(
    { frame, feetHeight }: RuntimeAuraCharacter,
    [viewX, viewY]: readonly [number, number],
  ): AuraPlacement {
    return {
      silhouette: this.silhouettes.sprite(
        frame.image,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
      ),
      x: frame.dx,
      y: frame.dy,
      viewX,
      viewY,
      ground: true,
      feetX: frame.dx + frame.sw / 2,
      feetY: frame.dy + feetHeight,
    };
  }
}

export const characterAuraRenderer = new CharacterAuraRenderer();
