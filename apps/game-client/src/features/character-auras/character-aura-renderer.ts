import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import type { RuntimeAuraCharacter } from "@/lib/margonem-runtime/adapters/aura-runtime-adapter";
import { legacyAuraRuntimeAdapter } from "@/lib/margonem-runtime/adapters/legacy-aura-runtime-adapter";
import type { AuraSurface, AuraView, SurfaceAura } from "./aura-surface";
import { Aura } from "./engine/render";
import type { AuraPlacement } from "./engine/placement";
import { SilhouetteCache } from "./engine/silhouette";
import { legacyAuraSurface } from "./legacy-aura-surface";
import { niAuraSurface } from "./ni-aura-surface";

/** The key of the hero among the drawn characters; others use their character id. */
export const HERO_AURA_KEY = "hero";

/** Consecutive failing frames (about two seconds) before a step gives up for the session. */
const MAX_FAILURES = 120;

/** The failure key of the per-frame work shared by every aura. */
const FRAME_KEY = "*";

type DrawnAura = SurfaceAura & {
  aura: Aura;
  place: AuraPlacement | null;
  /** The character's stacking order this frame. */
  order: number;
};

/** SI draws characters as map elements; NI, and the game while it starts, on its canvas. */
function resolveSurface(): AuraSurface {
  return legacyAuraRuntimeAdapter.isAvailable()
    ? legacyAuraSurface
    : niAuraSurface;
}

/**
 * Draws auras just under and over their characters, once per game frame, on
 * the NI canvas or the SI map. Only characters with an aura cost any work:
 * the hero when it wears one and the others whose account shows one.
 */
class CharacterAuraRenderer {
  private targets: ReadonlyMap<string, CharacterAuraId> = new Map();
  private readonly drawn = new Map<string, DrawnAura>();
  private readonly silhouettes = new SilhouetteCache();
  private surface: AuraSurface | null = null;
  private unsubscribe: (() => void) | null = null;
  private mapId: number | undefined;
  private last = 0;
  /** Consecutive failures by `FRAME_KEY`, aura key or one of its two draws. */
  private readonly failures = new Map<string, number>();
  /** Auras that kept failing and are no longer drawn. */
  private readonly disabled = new Set<string>();
  private broken = false;

  /** Whether this game draws characters where auras can follow them. */
  isAvailable(): boolean {
    return resolveSurface().isAvailable();
  }

  /** Characters to draw an aura on, by `HERO_AURA_KEY` or character id. */
  setTargets(targets: ReadonlyMap<string, CharacterAuraId>): void {
    this.targets = targets;

    for (const key of this.drawn.keys()) {
      if (!targets.has(key)) this.forget(key);
    }

    if (targets.size === 0) {
      this.stop();

      return;
    }

    if (this.unsubscribe || this.broken) return;
    this.surface = resolveSurface();
    this.last = performance.now();
    this.unsubscribe = this.surface.subscribeFrame(this.onFrame);
  }

  private forget(key: string): void {
    this.drawn.delete(key);
    this.surface?.forget(key);
  }

  private stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.drawn.clear();
    this.silhouettes.clear();
    this.surface?.clear();
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
        this.forget(key);
      }

      return undefined;
    }
  }

  private drawFrame(): void {
    const surface = this.surface;

    if (!surface) return;
    const now = performance.now();
    const dt = (now - this.last) / 1000;
    this.last = now;
    const view = this.guard(FRAME_KEY, () => this.currentView(surface));

    if (view === undefined) return;

    for (const [key, auraId] of this.targets) {
      this.guard(key, () => this.drawTarget(surface, key, auraId, view, dt));
    }

    this.guard(FRAME_KEY, () => surface.endFrame(), `${FRAME_KEY}:end`);
  }

  private currentView(surface: AuraSurface): AuraView | null {
    const view = surface.getView();

    // Particles live in map pixels; a new map starts every aura over.
    if (view && view.mapId !== this.mapId) {
      this.mapId = view.mapId;
      this.drawn.clear();
    }

    return view;
  }

  private drawTarget(
    surface: AuraSurface,
    key: string,
    auraId: CharacterAuraId,
    view: AuraView | null,
    dt: number,
  ): void {
    const character = view
      ? key === HERO_AURA_KEY
        ? surface.getHero()
        : surface.getOther(key)
      : null;

    const drawn = this.drawnAura(surface, key, auraId, character);

    drawn.place =
      view && character ? this.placement(character, view.camera) : null;
    drawn.aura.update(dt, drawn.place, 1);

    if (drawn.place) surface.show(key, drawn);
  }

  private drawnAura(
    surface: AuraSurface,
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
      drawBack: (context) =>
        this.guard(
          key,
          () => {
            if (drawn.place && surface.isInView(drawn.place, context))
              drawn.aura.drawBack(context, drawn.place, 1);
          },
          `${key}:back`,
        ),
      drawFront: (context) =>
        this.guard(
          key,
          () => {
            if (drawn.place && surface.isInView(drawn.place, context))
              drawn.aura.drawFront(context, drawn.place, 1);
          },
          `${key}:front`,
        ),
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
