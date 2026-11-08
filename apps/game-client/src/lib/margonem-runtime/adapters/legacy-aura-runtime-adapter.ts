import type { RuntimeAuraCharacter } from "./aura-runtime-adapter";

/** What SI keeps on the hero (player.js) and every other (elements.js `newOther`) it moves. */
type LegacyMapCharacter = {
  /** Drawn tile position; steps by 0.25 while walking. */
  rx?: number;
  ry?: number;
  /** One frame of the 4×4 sprite sheet. */
  fw?: number;
  fh?: number;
};

type LegacyAuraRuntimeWindow = Window & {
  Engine?: unknown;
  hero?: LegacyMapCharacter;
  map?: {
    id?: number;
    /** Map size in tiles (map.js `_u`). */
    x?: number;
    y?: number;
    /** The scroll `center` asked `#base` for (map.js:406). */
    scrollpos?: readonly [number, number];
  };
  g?: {
    other?: Record<string, LegacyMapCharacter | undefined>;
    /** The open battle, false once it closes (battle.js:19, :339). */
    battle?: unknown;
  };
};

const getRuntimeWindow = (): LegacyAuraRuntimeWindow => window;

const TILE = 32;

/** `#base`, the map viewport: 512 px wide and at most as tall (map.js:417). */
const VIEW_SIZE = 512;

/** The sprite sheet frame an element shows and the size of the whole sheet. */
export type LegacySpriteFrameInput = {
  backgroundPosition: string;
  frameWidth: number;
  frameHeight: number;
  imageWidth: number;
  imageHeight: number;
};

const mod = (value: number, size: number) => ((value % size) + size) % size;

function parsePixels(value: string | undefined): number | null {
  if (value === undefined) return null;

  const match = /^(-?\d+(?:\.\d+)?)(?:px)?$/.exec(value);

  return match?.[1] === undefined ? null : Number(match[1]);
}

/**
 * The source rect a `#hero` or `#other{id}` element shows. SI moves the
 * sheet by `step * fw` and `-dir * fh` (player.js:727, elements.js:2327), so
 * a positive offset or the hero's starting `dir` of -1 wraps round the
 * repeating background, as the browser draws it.
 */
export function legacySpriteFrame({
  backgroundPosition,
  frameWidth,
  frameHeight,
  imageWidth,
  imageHeight,
}: LegacySpriteFrameInput): {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
} | null {
  const [x, y] = backgroundPosition.trim().split(/\s+/);
  const offsetX = parsePixels(x);
  // A single value sets only x; y is then centred, which SI never uses.
  const offsetY = parsePixels(y);

  if (
    offsetX === null ||
    offsetY === null ||
    !(frameWidth > 0 && frameHeight > 0) ||
    !(imageWidth > 0 && imageHeight > 0)
  ) {
    return null;
  }

  const sx = Math.round(mod(-offsetX, imageWidth));
  const sy = Math.round(mod(-offsetY, imageHeight));

  if (sx + frameWidth > imageWidth || sy + frameHeight > imageHeight) {
    return null;
  }

  return { sx, sy, sw: frameWidth, sh: frameHeight };
}

/** The image of a `background-image: url(...)` value, as the style returns it. */
export function parseBackgroundImageUrl(value: string): string | null {
  const match = /^url\(\s*(["']?)(.+?)\1\s*\)$/.exec(value.trim());

  return match?.[2] ?? null;
}

/**
 * Sprites by url. SI loads every sprite through ImgLoader into a blob url
 * (functions.js:31-41) and sets it as the element's background, so a second
 * image of that url decodes from memory and its pixels stay readable.
 */
const sprites = new Map<string, HTMLImageElement>();

/** Outfit changes and passing players add sprites; old ones go once there are this many. */
const MAX_SPRITES = 64;

function spriteImage(url: string): HTMLImageElement | null {
  let image = sprites.get(url);

  if (!image) {
    if (sprites.size >= MAX_SPRITES) sprites.clear();
    image = new Image();
    image.src = url;
    sprites.set(url, image);
  }

  return image.complete && image.naturalWidth > 0 ? image : null;
}

function getCamera(): readonly [number, number] {
  const scroll = getRuntimeWindow().map?.scrollpos;
  const x = scroll?.[0];
  const y = scroll?.[1];

  // `#base` cannot scroll before the map's corner; a small map asks for it.
  return [
    Number.isFinite(x) ? Math.max(0, Number(x)) : 0,
    Number.isFinite(y) ? Math.max(0, Number(y)) : 0,
  ];
}

/**
 * A character as its map element shows it now. Position and frame size come
 * from the game's state, image, frame and stacking from the element's inline
 * style, which the game writes on every step; nothing here forces a layout.
 */
function toAuraCharacter(
  character: LegacyMapCharacter | undefined,
  element: HTMLElement | null,
  left: (rx: number, fw: number) => number,
  top: (ry: number, fh: number) => number,
): RuntimeAuraCharacter | null {
  if (!character || !element || element.style.display === "none") return null;

  const { rx, ry, fw, fh } = character;

  if (
    !Number.isFinite(rx) ||
    !Number.isFinite(ry) ||
    fw === undefined ||
    fh === undefined
  ) {
    return null;
  }

  const url = parseBackgroundImageUrl(element.style.backgroundImage);
  const image = url ? spriteImage(url) : null;

  if (!image) return null;

  const frame = legacySpriteFrame({
    backgroundPosition: element.style.backgroundPosition,
    frameWidth: fw,
    frameHeight: fh,
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
  });

  if (!frame) return null;

  const [cameraX, cameraY] = getCamera();
  const tileX = Number(rx);
  const tileY = Number(ry);
  // The game writes `zIndex: getLayerOrder(y, 10)`; a fractional row is
  // rejected by the style, so the element keeps the last whole one.
  const zIndex = Number.parseInt(element.style.zIndex, 10);

  return {
    frame: {
      image,
      ...frame,
      // The full frame, also in water where the game crops the element's
      // bottom (elements.js:2321-2325), as the NI aura uses the whole frame.
      dx: left(tileX, fw) - cameraX,
      dy: top(tileY, fh) - cameraY,
    },
    order: Number.isFinite(zIndex) ? zIndex : Math.round(tileY) * 2 + 10,
    feetHeight: fh,
  };
}

/** SI's map: `#base` and the `#hero` and `#other{id}` elements in it. */
export const legacyAuraRuntimeAdapter = {
  isAvailable(): boolean {
    const runtimeWindow = getRuntimeWindow();

    return (
      !runtimeWindow.Engine &&
      Boolean(runtimeWindow.g && runtimeWindow.hero && runtimeWindow.map)
    );
  },

  /** The current map, its scroll and size, or null while a battle covers it. */
  getView(): {
    mapId?: number;
    camera: readonly [number, number];
    mapSize: readonly [number, number];
    viewSize: readonly [number, number];
  } | null {
    const runtimeWindow = getRuntimeWindow();
    const map = runtimeWindow.map;
    const width = Number(map?.x) * TILE;
    const height = Number(map?.y) * TILE;

    if (
      runtimeWindow.g?.battle ||
      !(width > 0 && height > 0) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height)
    ) {
      return null;
    }

    return {
      mapId: map?.id,
      camera: getCamera(),
      mapSize: [width, height],
      viewSize: [VIEW_SIZE, VIEW_SIZE],
    };
  },

  /** `#base`, which scrolls the map and holds every character element. */
  getMapHost(): HTMLElement | null {
    return document.getElementById("base");
  },

  getHero(): RuntimeAuraCharacter | null {
    // player.js:663-664 rounds the hero's corner.
    return toAuraCharacter(
      getRuntimeWindow().hero,
      document.getElementById("hero"),
      (rx, fw) => Math.round(rx * TILE + 16 - fw / 2),
      (ry, fh) => Math.round(ry * TILE + TILE - fh),
    );
  },

  getOther(characterId: string): RuntimeAuraCharacter | null {
    // elements.js:2321-2322 places others without rounding.
    return toAuraCharacter(
      getRuntimeWindow().g?.other?.[characterId],
      document.getElementById(`other${characterId}`),
      (rx, fw) => rx * TILE + 16 - (fw >> 1),
      (ry, fh) => ry * TILE + TILE - fh,
    );
  },
};
