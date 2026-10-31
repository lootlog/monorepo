import type { FactionWarFaction } from "@lootlog/domain/faction-war";
import {
  getCanvasPlayerGroundPoint,
  getLegacyMapLayer,
  getLegacyPlayerGroundPoint,
} from "@/lib/margonem-runtime/adapters/character-ground-runtime-adapter";
import {
  rendererRuntimeAdapter,
  type RendererRuntimeAdapter,
  type RuntimeDrawable,
} from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import type { RuntimeInterface } from "@/lib/margonem-runtime/runtime.types";
import { getFactionWarAssetUrl } from "./faction-war-assets";
import type { VisibleChampion } from "./faction-war-champions";

/** Ground ring size in map pixels: two tiles wide around the feet. */
const AURA_WIDTH = 64;

const AURA_HEIGHT = 32;

/** The ring's centre sits this far above the bottom edge of the tile. */
const AURA_LIFT = 6;

/**
 * Just above the NI map (order 0) and below ground items (0.1) and every
 * character, so the ring lies on the ground under whoever stands on it.
 */
const AURA_DRAW_ORDER = 0.05;

/** SI's own ground auras (`.characterChampionMatchmaking`) use z-index 1. */
const LEGACY_AURA_Z_INDEX = "1";

/** More rings than this would only add noise; the rest are not drawn. */
const MAX_AURAS = 40;

const PULSE_PERIOD_MS = 3_600;

export type ChampionAuraState = {
  warId: string | null;
  runtimeInterface: RuntimeInterface | undefined;
  champions: readonly VisibleChampion[];
  animate: boolean;
};

type LegacyAura = {
  element: HTMLDivElement;
  ring: HTMLImageElement;
  faction: FactionWarFaction;
  x: number;
  y: number;
};

/**
 * Draws the winning faction's ring under each visible champion. NI adds one
 * drawable to the game renderer per frame; SI keeps one element per champion
 * in `#base` and moves it with the player on animation frames. Nothing is
 * registered while no champion is on the map, and every frame callback is
 * isolated so a failure never reaches the game loop.
 */
export class ChampionAuraController {
  private state: ChampionAuraState = {
    warId: null,
    runtimeInterface: undefined,
    champions: [],
    animate: false,
  };

  private readonly canvasImages = new Map<string, HTMLImageElement>();
  private unsubscribeDraw: (() => void) | null = null;
  private readonly legacyAuras = new Map<string, LegacyAura>();
  private legacyFrame: number | null = null;

  private readonly drawable: RuntimeDrawable = {
    draw: (context) => this.drawCanvasAuras(context),
    getAlwaysDraw: () => true,
    getOrder: () => AURA_DRAW_ORDER,
  };

  constructor(
    private readonly renderer: RendererRuntimeAdapter = rendererRuntimeAdapter,
  ) {}

  sync(next: ChampionAuraState): void {
    const champions = next.champions.slice(0, MAX_AURAS);

    this.state = { ...next, champions };

    const show = next.warId !== null && champions.length > 0;

    if (show && next.runtimeInterface === "ni") {
      this.removeLegacyAuras();
      this.attachCanvas();
    } else if (show && next.runtimeInterface === "si") {
      this.detachCanvas();
      this.syncLegacyAuras();
    } else {
      this.detachCanvas();
      this.removeLegacyAuras();
    }
  }

  dispose(): void {
    this.sync({
      warId: null,
      runtimeInterface: undefined,
      champions: [],
      animate: false,
    });
    this.canvasImages.clear();
  }

  private getAuraUrl(faction: FactionWarFaction): string | null {
    return this.state.warId
      ? getFactionWarAssetUrl(this.state.warId, faction, "aura")
      : null;
  }

  // NI ---------------------------------------------------------------------

  private attachCanvas(): void {
    for (const { faction } of this.state.champions)
      this.loadCanvasImage(faction);

    if (this.unsubscribeDraw || !this.renderer.isAvailable()) return;

    this.unsubscribeDraw = this.renderer.subscribeDraw(this.handleDrawFrame);
  }

  private detachCanvas(): void {
    this.unsubscribeDraw?.();
    this.unsubscribeDraw = null;
  }

  /**
   * The ring is drawn on the game canvas, so it is requested with CORS: an
   * image without it would taint the canvas. When the asset host does not
   * allow it, the image fails to load and NI simply shows no ring.
   */
  private loadCanvasImage(faction: FactionWarFaction): void {
    const url = this.getAuraUrl(faction);

    if (!url || this.canvasImages.has(url)) return;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.src = url;
    this.canvasImages.set(url, image);
  }

  private readonly handleDrawFrame = () => {
    try {
      if (this.state.champions.length > 0) {
        this.renderer.addDrawable(this.drawable);
      }
    } catch (error) {
      console.warn("[FactionWar] Failed to queue champion auras:", error);
    }
  };

  private drawCanvasAuras(context: CanvasRenderingContext2D): void {
    const now = performance.now();
    const previousAlpha = context.globalAlpha;
    const previousComposite = context.globalCompositeOperation;

    try {
      context.globalCompositeOperation = "lighter";

      for (const [
        index,
        { characterId, faction },
      ] of this.state.champions.entries()) {
        const url = this.getAuraUrl(faction);
        const image = url ? this.canvasImages.get(url) : undefined;

        if (!image?.complete || image.naturalWidth === 0) continue;

        const point = getCanvasPlayerGroundPoint(characterId);

        if (!point) continue;

        const pulse = this.state.animate
          ? 0.8 + 0.2 * Math.sin((now / PULSE_PERIOD_MS) * Math.PI * 2 + index)
          : 0.9;

        context.globalAlpha = previousAlpha * pulse;
        context.drawImage(
          image,
          Math.round(point.x - AURA_WIDTH / 2),
          Math.round(point.y - AURA_LIFT - AURA_HEIGHT / 2),
          AURA_WIDTH,
          AURA_HEIGHT,
        );
      }
    } catch (error) {
      console.warn("[FactionWar] Failed to draw champion auras:", error);
    } finally {
      context.globalAlpha = previousAlpha;
      context.globalCompositeOperation = previousComposite;
    }
  }

  // SI ---------------------------------------------------------------------

  private syncLegacyAuras(): void {
    const wanted = new Map(
      this.state.champions.map((champion) => [
        champion.characterId,
        champion.faction,
      ]),
    );

    for (const [characterId, aura] of this.legacyAuras) {
      if (wanted.get(characterId) !== aura.faction) {
        aura.element.remove();
        this.legacyAuras.delete(characterId);
      }
    }

    for (const [characterId, faction] of wanted) {
      const existing = this.legacyAuras.get(characterId);

      if (existing) {
        this.applyLegacyAnimation(existing.ring);
        continue;
      }

      const aura = this.createLegacyAura(faction);

      if (aura) this.legacyAuras.set(characterId, aura);
    }

    if (this.legacyAuras.size > 0) this.requestLegacyFrame();
  }

  private createLegacyAura(faction: FactionWarFaction): LegacyAura | null {
    const url = this.getAuraUrl(faction);

    if (!url) return null;

    const element = document.createElement("div");
    element.setAttribute("aria-hidden", "true");
    Object.assign(element.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${AURA_WIDTH}px`,
      height: `${AURA_HEIGHT}px`,
      zIndex: LEGACY_AURA_Z_INDEX,
      pointerEvents: "none",
      display: "none",
      mixBlendMode: "plus-lighter",
    });

    const ring = document.createElement("img");
    ring.src = url;
    ring.alt = "";
    ring.draggable = false;
    Object.assign(ring.style, {
      display: "block",
      width: "100%",
      height: "100%",
    });
    this.applyLegacyAnimation(ring);
    element.append(ring);

    return { element, ring, faction, x: Number.NaN, y: Number.NaN };
  }

  private applyLegacyAnimation(ring: HTMLImageElement): void {
    ring.style.animation = this.state.animate
      ? "ll-fw-aura-breathe 3.6s ease-in-out infinite"
      : "";
    ring.style.opacity = this.state.animate ? "" : "0.85";
  }

  private requestLegacyFrame(): void {
    if (this.legacyFrame !== null) return;

    this.legacyFrame = window.requestAnimationFrame(this.handleLegacyFrame);
  }

  /** Follows walking players; animation frames stop while the tab is hidden. */
  private readonly handleLegacyFrame = () => {
    this.legacyFrame = null;

    if (this.legacyAuras.size === 0) return;

    try {
      this.positionLegacyAuras();
    } catch (error) {
      console.warn("[FactionWar] Failed to move champion auras:", error);
    }

    this.requestLegacyFrame();
  };

  private positionLegacyAuras(): void {
    const layer = getLegacyMapLayer();

    for (const [characterId, aura] of this.legacyAuras) {
      const point = layer ? getLegacyPlayerGroundPoint(characterId) : null;

      if (!layer || !point) {
        if (!Number.isNaN(aura.x)) {
          aura.element.style.display = "none";
          aura.x = Number.NaN;
        }

        continue;
      }

      // SI rebuilds `#base` on some map changes; put the ring back.
      if (aura.element.parentElement !== layer) layer.append(aura.element);

      if (point.x === aura.x && point.y === aura.y) continue;

      if (Number.isNaN(aura.x)) aura.element.style.display = "block";

      aura.x = point.x;
      aura.y = point.y;
      aura.element.style.transform = `translate3d(${point.x - AURA_WIDTH / 2}px, ${
        point.y - AURA_LIFT - AURA_HEIGHT / 2
      }px, 0)`;
    }
  }

  private removeLegacyAuras(): void {
    if (this.legacyFrame !== null) {
      window.cancelAnimationFrame(this.legacyFrame);
      this.legacyFrame = null;
    }

    for (const aura of this.legacyAuras.values()) aura.element.remove();

    this.legacyAuras.clear();
  }
}

export const championAuraController = new ChampionAuraController();
