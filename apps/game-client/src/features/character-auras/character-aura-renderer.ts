import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import {
  auraRuntimeAdapter,
  type RuntimeAuraCharacter,
} from "@/lib/margonem-runtime/adapters/aura-runtime-adapter";
import {
  rendererRuntimeAdapter,
  type RuntimeDrawable,
} from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import { Aura, isAuraInView } from "./engine/render";
import type { AuraPlacement } from "./engine/placement";
import { SilhouetteCache } from "./engine/silhouette";

/** The key of the hero among the drawn characters; others use their character id. */
export const HERO_AURA_KEY = "hero";

/** Consecutive failing frames (about two seconds) before a step gives up for the session. */
const MAX_FAILURES = 120;

/** The failure key of the per-frame work shared by every aura. */
const FRAME_KEY = "*";

/** Just under and just over the character in the draw order, between it and the next row. */
const ORDER_EPSILON = 0.001;

type AuraView = NonNullable<ReturnType<typeof auraRuntimeAdapter.getView>>;

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
  /** Consecutive failures by `FRAME_KEY`, aura key or one of its two draws. */
  private readonly failures = new Map<string, number>();
  /** Auras that kept failing and are no longer drawn. */
  private readonly disabled = new Set<string>();
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
    this.silhouettes.clear();
  }

  private readonly onFrame = (): void => this.drawFrame();

  // Errors never leave the game's frame loop or renderer. A passing one (a
  // map change, a sprite still loading) skips the step. A long unbroken run
  // turns off only what keeps failing: one aura (a character the adapter
  // cannot read), or every aura when the shared frame work fails (a game
  // build the adapter no longer matches). Each step counts on its own, so
  // one that succeeds every frame cannot reset another that always fails.
  private guard<T>(key: string, step: () => T, counter = key): T | undefined {
    if (this.broken || this.disabled.has(key)) return undefined;

    try {
      const result = step();
      this.failures.delete(counter);

      return result;
    } catch (error) {
      const failures = (this.failures.get(counter) ?? 0) + 1;

      if (failures < MAX_FAILURES) {
        this.failures.set(counter, failures);

        return undefined;
      }

      this.failures.delete(counter);
      console.warn("[CharacterAuras] Drawing disabled after errors:", error);

      if (key === FRAME_KEY) {
        this.broken = true;
        this.stop();
      } else {
        this.disabled.add(key);
        this.drawn.delete(key);
      }

      return undefined;
    }
  }

  private drawFrame(): void {
    const now = performance.now();
    const dt = (now - this.last) / 1000;
    this.last = now;
    const view = this.guard(FRAME_KEY, () => this.currentView());

    if (view === undefined) return;

    for (const [key, auraId] of this.targets) {
      this.guard(key, () => this.drawTarget(key, auraId, view, dt));
    }
  }

  private currentView(): AuraView | null {
    const view = auraRuntimeAdapter.getView();

    // Particles live in map pixels; a new map starts every aura over.
    if (view && view.mapId !== this.mapId) {
      this.mapId = view.mapId;
      this.drawn.clear();
    }

    return view;
  }

  private drawTarget(
    key: string,
    auraId: CharacterAuraId,
    view: AuraView | null,
    dt: number,
  ): void {
    const character = view
      ? key === HERO_AURA_KEY
        ? auraRuntimeAdapter.getHero()
        : auraRuntimeAdapter.getOther(key)
      : null;

    const drawn = this.drawnAura(key, auraId, character);

    drawn.place =
      view && character ? this.placement(character, view.camera) : null;
    drawn.aura.update(dt, drawn.place, 1);

    if (!drawn.place) return;
    rendererRuntimeAdapter.addDrawable(drawn.back);
    rendererRuntimeAdapter.addDrawable(drawn.front);
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

    // The game draws these whatever their position (`getAlwaysDraw`), so an
    // aura off the visible canvas skips its tick render and blits here.
    const drawn: DrawnAura = {
      aura: new Aura(auraId),
      place: null,
      order: character?.order ?? 0,
      back: {
        getAlwaysDraw: () => true,
        getOrder: () => drawn.order - ORDER_EPSILON,
        draw: (context) =>
          this.guard(
            key,
            () => {
              if (drawn.place && isInCanvas(drawn.place, context))
                drawn.aura.drawBack(context, drawn.place, 1);
            },
            `${key}:back`,
          ),
      },
      front: {
        getAlwaysDraw: () => true,
        getOrder: () => drawn.order + ORDER_EPSILON,
        draw: (context) =>
          this.guard(
            key,
            () => {
              if (drawn.place && isInCanvas(drawn.place, context))
                drawn.aura.drawFront(context, drawn.place, 1);
            },
            `${key}:front`,
          ),
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

/** Whether an aura shows on the game canvas; the game scales the context by its zoom. */
function isInCanvas(
  place: AuraPlacement,
  context: CanvasRenderingContext2D,
): boolean {
  const { a: scaleX, d: scaleY } = context.getTransform();

  return isAuraInView(
    place,
    context.canvas.width / scaleX,
    context.canvas.height / scaleY,
  );
}

export const characterAuraRenderer = new CharacterAuraRenderer();
