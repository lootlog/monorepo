import type { CharacterAuraId } from "@lootlog/schema/character-aura";
import type { RuntimeAuraCharacter } from "@/lib/margonem-runtime/adapters/aura-runtime-adapter";
import { Aura } from "./engine/render";
import type { AuraPlacement } from "./engine/placement";
import { SilhouetteCache } from "./engine/silhouette";

/** The key of the hero among the drawn characters; others use their character id. */
export const HERO_AURA_KEY = "hero";

/** Consecutive failing frames (about two seconds) before a step gives up for the session. */
const MAX_FAILURES = 120;

/** The failure key of the per-frame work shared by every aura. */
const FRAME_KEY = "*";

/** The map an aura is drawn on and its camera: particle space minus screen space. */
export type AuraView = { mapId?: number; camera: readonly [number, number] };

/** Paints one side of an aura into a context whose origin is the screen's. */
export type AuraPaint = (context: CanvasRenderingContext2D) => void;

/** An aura shown this frame: its character, where it goes and its two sides. */
export type ShownAura<C extends RuntimeAuraCharacter> = {
  character: C;
  place: AuraPlacement;
  back: AuraPaint;
  front: AuraPaint;
};

/** Where auras are drawn: the NI canvas or the SI map elements. */
export interface CharacterAuraSurface<C extends RuntimeAuraCharacter> {
  /** The current map, or null while it is not drawn. */
  getView(): AuraView | null;
  getHero(): C | null;
  getOther(characterId: string): C | null;
  /** Calls `onFrame` once per drawn frame until unsubscribed. */
  subscribeFrame(onFrame: () => void): (() => void) | null;
  /** Whether an aura at `place` lands on what `context` draws. */
  isInView(place: AuraPlacement, context: CanvasRenderingContext2D): boolean;
  /** Shows the aura of `key` this frame, or hides it when null. */
  present(key: string, shown: ShownAura<C> | null): void;
  /** Forgets everything shown for `key`. */
  release(key: string): void;
}

type DrawnAura = {
  aura: Aura;
  place: AuraPlacement | null;
  back: AuraPaint;
  front: AuraPaint;
};

/**
 * Draws auras on a surface just under and over their characters, once per
 * frame. Only characters with an aura cost any work: the hero when it wears
 * one and the others whose account shows one.
 */
export class CharacterAuraRenderer<C extends RuntimeAuraCharacter> {
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

  constructor(private readonly surface: CharacterAuraSurface<C>) {}

  /** Characters to draw an aura on, by `HERO_AURA_KEY` or character id. */
  setTargets(targets: ReadonlyMap<string, CharacterAuraId>): void {
    this.targets = targets;

    for (const key of this.drawn.keys()) {
      if (!targets.has(key)) this.drop(key);
    }

    if (targets.size === 0) {
      this.stop();

      return;
    }

    if (this.unsubscribe || this.broken) return;
    this.last = performance.now();
    this.unsubscribe = this.surface.subscribeFrame(this.onFrame);
  }

  private stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.dropAll();
    this.silhouettes.clear();
  }

  private drop(key: string): void {
    this.drawn.delete(key);
    this.surface.release(key);
  }

  private dropAll(): void {
    for (const key of this.drawn.keys()) this.drop(key);
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
        this.drop(key);
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
    const view = this.surface.getView();

    // Particles live in map pixels; a new map starts every aura over.
    if (view && view.mapId !== this.mapId) {
      this.mapId = view.mapId;
      this.dropAll();
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
        ? this.surface.getHero()
        : this.surface.getOther(key)
      : null;

    const drawn = this.drawnAura(key, auraId);

    drawn.place =
      view && character ? this.placement(character, view.camera) : null;
    drawn.aura.update(dt, drawn.place, 1);

    this.surface.present(
      key,
      character && drawn.place
        ? {
            character,
            place: drawn.place,
            back: drawn.back,
            front: drawn.front,
          }
        : null,
    );
  }

  private drawnAura(key: string, auraId: CharacterAuraId): DrawnAura {
    const existing = this.drawn.get(key);

    if (existing) {
      existing.aura.setPreset(auraId);

      return existing;
    }

    const drawn: DrawnAura = {
      aura: new Aura(auraId),
      place: null,
      back: (context) =>
        this.guard(
          key,
          () => {
            if (drawn.place && this.surface.isInView(drawn.place, context))
              drawn.aura.drawBack(context, drawn.place, 1);
          },
          `${key}:back`,
        ),
      front: (context) =>
        this.guard(
          key,
          () => {
            if (drawn.place && this.surface.isInView(drawn.place, context))
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
