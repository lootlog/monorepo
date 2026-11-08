import type {
  RuntimeAuraCharacter,
  RuntimeCharacterFrame,
} from "./aura-runtime-adapter";
import {
  getLegacyOtherElement,
  getLegacyRuntimeOther,
} from "./tooltip-runtime-adapter";

/** An SI character as the aura sees it: its frame and the map element it is drawn as. */
export type LegacyAuraCharacter = RuntimeAuraCharacter & {
  /** `#hero` or `#other{id}`, the element the aura's layers sit beside. */
  element: HTMLElement;
};

/** The two canvases of one aura: under and over its character. */
export type LegacyAuraLayers = {
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
};

/** A layer's rect in `#base` pixels, which are map pixels. */
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

/** Sprites are swapped rarely; the cache only guards against unbounded growth. */
const MAX_SPRITES = 256;

/** The sprite of each `background-image` url SI gave a character element. */
const sprites = new Map<string, HTMLImageElement>();

const BACKGROUND_URL = /^url\((["']?)(.+)\1\)$/;

/**
 * SI loads a sprite through XHR into a `blob:` url of the page's own origin
 * (functions.js `ImgLoader.onload`) and sets it as the element's background,
 * so the same url decodes again from memory and its pixels can be read.
 */
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

/**
 * The frame SI shows on a character element. `moveOther` (elements.js) and
 * `hero.run` (player.js) set its inline left, top, size, z-index and the
 * background position of the sprite's 4×4 frame grid; in water the element
 * is pushed down and cut shorter, so the visible part is what it shows.
 */
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
  // `getLayerOrder` (elements.js) sets `y * 2 + 10`; a fraction mid-step is
  // not a valid z-index, so the element keeps its last whole one.
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
  // Inline only: no stylesheet rule matches these, and the map's clicks and
  // tips go through them to the characters and ground underneath.
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

/** SI's map: `#base` holds the hero and others as positioned elements in map pixels. */
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

  /**
   * Puts the layers right before and after the character's element with its
   * z-index, so the back one paints under it and the front one over it,
   * both under the characters of the rows in front.
   */
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
};
