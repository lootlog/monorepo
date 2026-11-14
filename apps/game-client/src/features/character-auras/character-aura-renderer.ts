import {
  isAdminCharacterAuraId,
  type CharacterAuraId,
} from "@lootlog/schema/character-aura";
import type { RuntimeAuraCharacter } from "@/lib/margonem-runtime/adapters/aura-runtime-adapter";
import { Aura } from "./engine/render";
import type { AuraPlacement } from "./engine/placement";
import { SilhouetteCache } from "./engine/silhouette";

/** The key of the hero among the drawn characters; others use their character id. */
export const HERO_AURA_KEY = "hero";

/** Consecutive failing frames (about two seconds) before a step gives up for the session. */
const MAX_FAILURES = 120;

/**
 * Each new aura's tick phase moves on by this fraction, so any number of auras keep
 * their tick renders on different frames.
 */
const GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2;

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

/**
 * An aura's effects over the whole map (an admin's arrival, a storm): where its character
 * is, how dark the map gets and how to paint it.
 */
export type ShownArrival = {
  place: AuraPlacement;
  /** 0..1. */
  darkness: number;
  /** What the map is dimmed with, where a surface can only lay a flat veil over it. */
  veil: readonly [number, number, number];
  /** Paints the arrival over the whole map into a context whose origin is the screen's. */
  paint: AuraPaint;
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
  /** Shows an aura's effects over the whole map this frame, or hides them when null. */
  presentArrival(arrival: ShownArrival | null): void;
}

type DrawnAura = {
  aura: Aura;
  place: AuraPlacement | null;
  back: AuraPaint;
  front: AuraPaint;
  arrival: AuraPaint;
};

/**
 * Draws auras on a surface just under and over their characters, once per
 * frame. Only characters with an aura cost any work: the hero when it wears
 * one and the others whose account shows one.
 */
export class CharacterAuraRenderer<C extends RuntimeAuraCharacter> {
  private targets: ReadonlyMap<string, CharacterAuraId> = new Map();
  /** How many other characters' auras are drawn, nearest the hero first; null for all. */
  private othersLimit: number | null = null;
  private readonly drawn = new Map<string, DrawnAura>();
  private readonly silhouettes = new SilhouetteCache();
  private unsubscribe: (() => void) | null = null;
  private mapId: number | undefined;
  private last = 0;
  /** Auras created so far, which spreads their tick phases. */
  private created = 0;
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

  /** Draws only the `limit` other auras nearest the hero, or every aura when null. */
  setOthersLimit(limit: number | null): void {
    this.othersLimit = limit;
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
    this.silhouettes.beginFrame();
    const shown = this.guard(FRAME_KEY, () => this.shownTargets(view));

    if (shown === undefined) return;

    for (const key of this.drawn.keys()) {
      if (!shown.has(key)) this.drop(key);
    }

    for (const [key, auraId] of shown) {
      this.guard(key, () => this.drawTarget(key, auraId, view, dt));
    }

    this.surface.presentArrival(this.darkestArrival());
  }

  /**
   * The one aura whose effects go over the whole map this frame: of those that have
   * any, the one dimming the map most.
   */
  private darkestArrival(): ShownArrival | null {
    let darkest: ShownArrival | null = null;

    for (const drawn of this.drawn.values()) {
      const effect = drawn.aura.mapEffect();

      if (!drawn.place || !effect) continue;

      if (darkest && effect.gloom <= darkest.darkness) continue;

      darkest = {
        place: drawn.place,
        darkness: effect.gloom,
        veil: effect.veil,
        paint: drawn.arrival,
      };
    }

    return darkest;
  }

  /**
   * The targets drawn this frame: all, or the hero, every admin aura (meant to be seen
   * across the map) and the others nearest the hero.
   */
  private shownTargets(
    view: AuraView | null,
  ): ReadonlyMap<string, CharacterAuraId> {
    const limit = this.othersLimit;

    if (limit === null) return this.targets;
    const heroAura = this.targets.get(HERO_AURA_KEY);

    if (this.targets.size - (heroAura ? 1 : 0) <= limit) return this.targets;

    const hero = view ? this.surface.getHero() : null;
    const nearest: { key: string; distance: number }[] = [];
    const shown = new Map<string, CharacterAuraId>();

    if (heroAura) shown.set(HERO_AURA_KEY, heroAura);

    for (const [key, auraId] of this.targets) {
      if (key === HERO_AURA_KEY) continue;

      if (isAdminCharacterAuraId(auraId)) {
        shown.set(key, auraId);
        continue;
      }

      const other = view ? this.surface.getOther(key) : null;

      if (!other) continue;

      const distance = hero
        ? Math.hypot(
            other.frame.dx - hero.frame.dx,
            other.frame.dy - hero.frame.dy,
          )
        : 0;

      nearest.push({ key, distance });
    }

    for (const { key } of nearest
      .toSorted((a, b) => a.distance - b.distance)
      .slice(0, limit)) {
      const auraId = this.targets.get(key);

      if (auraId) shown.set(key, auraId);
    }

    return shown;
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
      view && character
        ? this.placement(character, view.camera, drawn.place)
        : null;
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
      aura: new Aura(auraId, undefined, (this.created++ * GOLDEN_RATIO) % 1),
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
      // The context's transform scales by the game's zoom.
      arrival: (context) =>
        this.guard(
          key,
          () => {
            const { a: scaleX, d: scaleY } = context.getTransform();

            if (drawn.place)
              drawn.aura.drawMapEffects(
                context,
                drawn.place,
                context.canvas.width / scaleX,
                context.canvas.height / scaleY,
              );
          },
          `${key}:arrival`,
        ),
    };

    this.drawn.set(key, drawn);

    return drawn;
  }

  /**
   * Where the aura goes this frame. A frame whose silhouette waits for a later frame's build
   * budget keeps the last one, which matches but for a step of the walk; an aura with none yet
   * waits unseen.
   */
  private placement(
    { frame, feetHeight }: RuntimeAuraCharacter,
    [viewX, viewY]: readonly [number, number],
    last: AuraPlacement | null,
  ): AuraPlacement | null {
    const silhouette =
      this.silhouettes.sprite(
        frame.image,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
      ) ?? last?.silhouette;

    if (!silhouette) return null;

    return {
      silhouette,
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
