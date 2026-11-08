import { legacyAuraRuntimeAdapter } from "@/lib/margonem-runtime/adapters/legacy-aura-runtime-adapter";
import type { AuraSurface, SurfaceAura } from "./aura-surface";
import { isAuraInView } from "./engine/render";
import type { AuraPlacement } from "./engine/placement";

/**
 * Room around the silhouette's padding: the aura's own render margin (28 px)
 * plus how far its buffers drift between ticks with the character and the
 * scroll (16 px).
 */
const CANVAS_MARGIN = 48;

type LegacyView = NonNullable<
  ReturnType<typeof legacyAuraRuntimeAdapter.getView>
>;

/** One canvas and what was last written to it, so unchanged styles are not written again. */
type LayerCanvas = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  transform: string;
  zIndex: string;
};

type Layers = { back: LayerCanvas; front: LayerCanvas; shown: boolean };

function createLayerCanvas(): LayerCanvas {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:absolute;left:0;top:0;pointer-events:none;image-rendering:pixelated";
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Canvas 2D context is unavailable.");

  return { canvas, context, transform: "", zIndex: "" };
}

function setHidden(layers: Layers, hidden: boolean): void {
  layers.shown = !hidden;
  layers.back.canvas.hidden = hidden;
  layers.front.canvas.hidden = hidden;
}

/**
 * SI's map, where characters are elements in `#base` stacked by `z-index`
 * (elements.js `getLayerOrder`). Each aura gets a canvas just under and one
 * just over its character, in a layer the size of the map, so `#base`
 * scrolls them with the map and they never widen what it can scroll. The
 * layer forms no stacking context, so the canvases interleave with the
 * characters. Frames come from `requestAnimationFrame` while any aura shows.
 */
class LegacyAuraSurface implements AuraSurface {
  private readonly layer: HTMLDivElement;
  private readonly layers = new Map<string, Layers>();
  private readonly shown = new Set<string>();
  private view: LegacyView | null = null;
  private layerSize = "";

  constructor() {
    this.layer = document.createElement("div");
    this.layer.style.cssText =
      "position:absolute;left:0;top:0;overflow:hidden;pointer-events:none";
  }

  isAvailable(): boolean {
    return legacyAuraRuntimeAdapter.isAvailable();
  }

  subscribeFrame(onFrame: () => void): (() => void) | null {
    let frame = requestAnimationFrame(function loop() {
      frame = requestAnimationFrame(loop);
      onFrame();
    });

    return () => cancelAnimationFrame(frame);
  }

  getView() {
    this.view = legacyAuraRuntimeAdapter.getView();

    return this.view;
  }

  getHero() {
    return legacyAuraRuntimeAdapter.getHero();
  }

  getOther(characterId: string) {
    return legacyAuraRuntimeAdapter.getOther(characterId);
  }

  isInView(place: AuraPlacement): boolean {
    const [width, height] = this.view?.viewSize ?? [0, 0];

    return isAuraInView(place, width, height);
  }

  show(key: string, aura: SurfaceAura): void {
    const { place } = aura;
    const view = this.view;

    if (!place || !view || !this.mount(view)) return;

    let layers = this.layers.get(key);

    if (!layers) {
      layers = {
        back: createLayerCanvas(),
        front: createLayerCanvas(),
        shown: true,
      };
      this.layer.append(layers.back.canvas, layers.front.canvas);
      this.layers.set(key, layers);
    }

    const margin = place.silhouette.pad + CANVAS_MARGIN;
    const x = Math.round(place.x) - margin;
    const y = Math.round(place.y) - margin;

    const box = {
      x,
      y,
      width: place.silhouette.width + margin * 2,
      height: place.silhouette.height + margin * 2,
      // Screen plus camera is the map, which the layer spans.
      transform: `translate(${x + Math.round(place.viewX)}px,${y + Math.round(place.viewY)}px)`,
    };

    if (!layers.shown) setHidden(layers, false);
    paint(layers.back, box, String(aura.order - 1), aura.drawBack);
    paint(layers.front, box, String(aura.order + 1), aura.drawFront);
    this.shown.add(key);
  }

  endFrame(): void {
    for (const [key, layers] of this.layers) {
      if (!this.shown.has(key) && layers.shown) setHidden(layers, true);
    }

    this.shown.clear();
  }

  forget(key: string): void {
    const layers = this.layers.get(key);

    if (!layers) return;
    layers.back.canvas.remove();
    layers.front.canvas.remove();
    this.layers.delete(key);
  }

  clear(): void {
    for (const key of this.layers.keys()) this.forget(key);
    this.shown.clear();
    this.layer.remove();
    this.view = null;
  }

  /** Puts the layer into `#base`, sized to the map; false while there is no `#base`. */
  private mount(view: LegacyView): boolean {
    const host = legacyAuraRuntimeAdapter.getMapHost();

    if (!host) return false;

    if (this.layer.parentElement !== host) host.append(this.layer);
    const [width, height] = view.mapSize;
    const size = `${width}x${height}`;

    if (this.layerSize !== size) {
      this.layerSize = size;
      this.layer.style.width = `${width}px`;
      this.layer.style.height = `${height}px`;
    }

    return true;
  }
}

/** Places a canvas over `box` (screen pixels) and redraws it there. */
function paint(
  layer: LayerCanvas,
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
    transform: string;
  },
  zIndex: string,
  draw: (context: CanvasRenderingContext2D) => void,
): void {
  const { canvas, context } = layer;

  // Resizing clears the canvas and resets its context.
  if (canvas.width !== box.width) canvas.width = box.width;

  if (canvas.height !== box.height) canvas.height = box.height;

  if (layer.transform !== box.transform) {
    layer.transform = box.transform;
    canvas.style.transform = box.transform;
  }

  if (layer.zIndex !== zIndex) {
    layer.zIndex = zIndex;
    canvas.style.zIndex = zIndex;
  }

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, box.width, box.height);
  context.setTransform(1, 0, 0, 1, -box.x, -box.y);
  draw(context);
}

export const legacyAuraSurface = new LegacyAuraSurface();
