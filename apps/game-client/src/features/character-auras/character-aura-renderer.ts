import {
  isAdminCharacterAuraId,
  type CharacterAuraId,
} from "@lootlog/schema/character-aura";
import type { RuntimeAuraCharacter } from "@/lib/margonem-runtime/adapters/aura-runtime-adapter";
import { Aura } from "./engine/render";
import type { AuraPlacement } from "./engine/placement";
import { SilhouetteCache } from "./engine/silhouette";

export const HERO_AURA_KEY = "hero";

const MAX_FAILURES = 120;

const GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2;

const FRAME_KEY = "*";

export type AuraView = { mapId?: number; camera: readonly [number, number] };

export type AuraPaint = (context: CanvasRenderingContext2D) => void;

export type ShownAura<C extends RuntimeAuraCharacter> = {
  character: C;
  place: AuraPlacement;
  back: AuraPaint;
  front: AuraPaint;
};

export type ShownArrival = {
  place: AuraPlacement;
  darkness: number;
  veil: readonly [number, number, number];
  paint: AuraPaint;
};

export interface CharacterAuraSurface<C extends RuntimeAuraCharacter> {
  getView(): AuraView | null;
  getHero(): C | null;
  getOther(characterId: string): C | null;
  subscribeFrame(onFrame: () => void): (() => void) | null;
  isInView(place: AuraPlacement, context: CanvasRenderingContext2D): boolean;
  present(key: string, shown: ShownAura<C> | null): void;
  release(key: string): void;
  presentArrival(arrival: ShownArrival | null): void;
}

type DrawnAura = {
  aura: Aura;
  place: AuraPlacement | null;
  back: AuraPaint;
  front: AuraPaint;
  arrival: AuraPaint;
};

export class CharacterAuraRenderer<C extends RuntimeAuraCharacter> {
  private targets: ReadonlyMap<string, CharacterAuraId> = new Map();
  private othersLimit: number | null = null;
  private readonly drawn = new Map<string, DrawnAura>();
  private readonly silhouettes = new SilhouetteCache();
  private unsubscribe: (() => void) | null = null;
  private mapId: number | undefined;
  private last = 0;
  private created = 0;
  private readonly failures = new Map<string, number>();
  private readonly disabled = new Set<string>();
  private broken = false;

  constructor(private readonly surface: CharacterAuraSurface<C>) {}

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
