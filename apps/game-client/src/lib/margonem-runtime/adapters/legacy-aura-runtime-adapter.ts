import type {
  RuntimeAuraCharacter,
  RuntimeCharacterFrame,
} from "./aura-runtime-adapter";
import {
  getLegacyOtherElement,
  getLegacyRuntimeOther,
} from "./tooltip-runtime-adapter";

export type LegacyAuraCharacter = RuntimeAuraCharacter & {
  element: HTMLElement;
};

export type LegacyAuraLayers = {
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
};

export type LegacyAuraLayerBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type LegacyAuraRuntimeWindow = Window & {
  Engine?: unknown;
  map?: { id?: number };
};

const getRuntimeWindow = (): LegacyAuraRuntimeWindow => window;

const MAX_SPRITES = 256;

const sprites = new Map<string, HTMLImageElement>();

const BACKGROUND_URL = /^url\((["']?)(.+)\1\)$/;

function spriteOf(backgroundImage: string): HTMLImageElement | null {
  const url = BACKGROUND_URL.exec(backgroundImage)?.[2];

  if (!url) return null;
  let image = sprites.get(url);

  if (!image) {
    if (sprites.size >= MAX_SPRITES) sprites.clear();
    image = new Image();
    image.src = url;
    sprites.set(url, image);
  }

  return image.complete && image.naturalWidth > 0 ? image : null;
}

function modulo(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function readFrame(element: HTMLElement): RuntimeCharacterFrame | null {
  const { style } = element;

  if (!element.isConnected || style.display === "none") return null;
  const image = spriteOf(style.backgroundImage);

  if (!image) return null;

  const [bx = Number.NaN, by = Number.NaN] = style.backgroundPosition
    .split(" ")
    .map((value) => Number.parseFloat(value));

  const frame = {
    image,
    sx: modulo(-bx, image.naturalWidth),
    sy: modulo(-by, image.naturalHeight),
    sw: Number.parseFloat(style.width),
    sh: Number.parseFloat(style.height),
    dx: Number.parseFloat(style.left),
    dy: Number.parseFloat(style.top),
  };

  const valid =
    frame.sw > 0 &&
    frame.sh > 0 &&
    Number.isFinite(frame.sx) &&
    Number.isFinite(frame.sy) &&
    Number.isFinite(frame.dx) &&
    Number.isFinite(frame.dy);

  return valid ? frame : null;
}

function toAuraCharacter(
  element: HTMLElement | null,
): LegacyAuraCharacter | null {
  const frame = element && readFrame(element);

  if (!element || !frame) return null;
  const order = Number.parseInt(element.style.zIndex, 10);

  return {
    element,
    frame,
    order: Number.isFinite(order) ? order : 0,
    feetHeight: frame.sh,
  };
}

function createLayer(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 0;
  canvas.height = 0;
  canvas.style.cssText = "position:absolute;left:0;top:0;pointer-events:none";

  return canvas;
}

function placeLayer(
  layer: HTMLCanvasElement,
  box: LegacyAuraLayerBox,
  zIndex: string,
): void {
  if (layer.width !== box.width) layer.width = box.width;

  if (layer.height !== box.height) layer.height = box.height;

  const transform = `translate(${box.x}px,${box.y}px)`;

  if (layer.style.transform !== transform) layer.style.transform = transform;

  if (layer.style.zIndex !== zIndex) layer.style.zIndex = zIndex;
}

export const legacyAuraRuntimeAdapter = {
  isAvailable(): boolean {
    return (
      getRuntimeWindow().Engine === undefined &&
      document.getElementById("base") !== null
    );
  },

  getMapId(): number | undefined {
    return getRuntimeWindow().map?.id;
  },

  getHero(): LegacyAuraCharacter | null {
    return toAuraCharacter(document.getElementById("hero"));
  },

  getOther(characterId: string): LegacyAuraCharacter | null {
    if (!getLegacyRuntimeOther(characterId)) return null;

    return toAuraCharacter(getLegacyOtherElement(characterId));
  },

  createLayers(): LegacyAuraLayers {
    return { back: createLayer(), front: createLayer() };
  },

  placeLayers(
    layers: LegacyAuraLayers,
    element: HTMLElement,
    box: LegacyAuraLayerBox,
  ): void {
    const { back, front } = layers;

    if (element.previousSibling !== back) element.before(back);

    if (element.nextSibling !== front) element.after(front);

    placeLayer(back, box, element.style.zIndex);
    placeLayer(front, box, element.style.zIndex);
  },

  removeLayers(layers: LegacyAuraLayers): void {
    layers.back.remove();
    layers.front.remove();
  },

  createVeil(): HTMLDivElement {
    const veil = document.createElement("div");
    veil.style.cssText =
      "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:2147483000";

    return veil;
  },

  placeVeil(veil: HTMLDivElement, background: string): boolean {
    const base = document.getElementById("base");

    if (!base) return false;

    if (veil.parentElement !== base) base.append(veil);

    if (veil.style.background !== background)
      veil.style.background = background;

    return true;
  },
};
