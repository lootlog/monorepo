import type { CharacterTipUpdate } from "@lootlog/margonem/tooltip";

/** The frame a character drew: its source rect on the sprite and where it landed on screen. */
export type RuntimeCharacterFrame = {
  image: CanvasImageSource;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
};

/** A character as the aura sees it this frame. */
export type RuntimeAuraCharacter = {
  frame: RuntimeCharacterFrame;
  /** The character's draw order (Character.js `getOrder`). */
  order: number;
  /** Height of the sprite's feet below the frame top; the frame height for most outfits. */
  feetHeight: number;
};

/** The part of the canvas context Character.js `drawIcon` draws a character with. */
type CharacterIconContext = Pick<
  CanvasRenderingContext2D,
  | "globalAlpha"
  | "drawImage"
  | "fillRect"
  | "strokeRect"
  | "fillText"
  | "save"
  | "restore"
>;

/** What Character.js gives every drawn character, the hero and others. */
type RuntimeCanvasCharacter = {
  imgLoaded?: boolean;
  fh?: number;
  ry?: number;
  d?: { account?: number | string; y?: number };
  drawIcon?: (
    context: CharacterIconContext,
    ignoreWraithShadow?: boolean,
  ) => void;
  getOrder?: () => number;
  updateTip?: () => void;
  tipUpdate?: () => void;
};

type AuraRuntimeWindow = Window & {
  checkBattleWindowActive?: () => boolean;
  Engine?: {
    hero?: RuntimeCanvasCharacter;
    others?: { getById?: (id: string) => RuntimeCanvasCharacter | undefined };
    map?: { d?: { id?: number }; getOffset?: () => [number, number] };
    rajCharacterHide?: {
      checkHideObject?: (character: RuntimeCanvasCharacter) => boolean;
    };
    interface?: { get$tipLayer?: () => ArrayLike<HTMLElement> | undefined };
  };
};

const getRuntimeWindow = (): AuraRuntimeWindow => window;

let recorded: RuntimeCharacterFrame | null = null;

/**
 * Stands in for the game canvas while `drawIcon` runs and records the frame it
 * blits instead of drawing it. In water `drawIcon` blits twice, the full frame
 * faded and then the part above the water (Character.js:349); the tallest one
 * is the whole frame.
 */
const recorder = {
  globalAlpha: 1,
  drawImage(...args: unknown[]) {
    if (args.length < 9) return;

    // SAFETY: the nine-argument drawImage is the source-rect form, so its first seven
    // arguments are the image, the source rect and the destination corner.
    const [image, sx, sy, sw, sh, dx, dy] = args as [
      CanvasImageSource,
      number,
      number,
      number,
      number,
      number,
      number,
    ];

    if (recorded && recorded.sh >= sh) return;
    recorded = { image, sx, sy, sw, sh, dx, dy };
  },
  fillRect() {},
  strokeRect() {},
  fillText() {},
  save() {},
  restore() {},
} satisfies CharacterIconContext;

/** Takes the frame the recorder kept during `drawIcon` and clears it. */
function takeRecordedFrame(): RuntimeCharacterFrame | null {
  const frame = recorded;
  recorded = null;

  return frame;
}

/** Whether a character tip's object is a hero or other drawn by Character.js. */
function isCanvasCharacter(
  object: CharacterTipUpdate["object"],
): object is RuntimeCanvasCharacter {
  return typeof object === "object" && object !== null;
}

function hasPixels(image: CanvasImageSource): boolean {
  if (image instanceof HTMLImageElement) {
    return image.complete && image.naturalWidth > 0;
  }

  // An SVG image's width is an animated length, not pixels; it is drawn as it is.
  if ("width" in image && Number.isFinite(image.width)) {
    return Number(image.width) > 0 && Number(image.height) > 0;
  }

  return true;
}

/**
 * Asks the character which frame it draws now through the game's own
 * `drawIcon` (Character.js:285), so water, animated outfits and offsets match.
 */
export function captureCharacterFrame(
  character: RuntimeCanvasCharacter,
): RuntimeCharacterFrame | null {
  if (!character.imgLoaded || !character.drawIcon) return null;

  recorded = null;
  character.drawIcon(recorder, true);
  const frame = takeRecordedFrame();

  // On a map change the hero loses its position for a few frames (Hero.js
  // `onClear` deletes rx/ry), so drawIcon blits at NaN; a sprite swapped for
  // the new map may not have loaded yet.
  if (
    !frame ||
    !(frame.sw > 0 && frame.sh > 0) ||
    !Number.isFinite(frame.dx) ||
    !Number.isFinite(frame.dy)
  ) {
    return null;
  }

  return hasPixels(frame.image) ? frame : null;
}

function toAuraCharacter(
  character: RuntimeCanvasCharacter | undefined,
): RuntimeAuraCharacter | null {
  const engine = getRuntimeWindow().Engine;

  if (!character || engine?.rajCharacterHide?.checkHideObject?.(character)) {
    return null;
  }

  const frame = captureCharacterFrame(character);

  if (!frame) return null;

  const order =
    character.getOrder?.() ?? (character.ry ?? character.d?.y ?? 0) + 0.5;

  return {
    frame,
    order: Number.isFinite(order) ? order : 0,
    feetHeight: character.fh ?? frame.sh,
  };
}

/** The NI map, its camera and the hero and others drawn on it. */
export const auraRuntimeAdapter = {
  isAvailable(): boolean {
    return Boolean(getRuntimeWindow().Engine?.hero);
  },

  /** The current map and its camera, or null while the map is not drawn. */
  getView(): { mapId?: number; camera: readonly [number, number] } | null {
    const runtimeWindow = getRuntimeWindow();
    const map = runtimeWindow.Engine?.map;
    const camera = map?.getOffset?.();

    // The map is not drawn while the battle window covers it (Engine.js:981).
    if (
      !camera ||
      runtimeWindow.checkBattleWindowActive?.() ||
      !Number.isFinite(camera[0]) ||
      !Number.isFinite(camera[1])
    ) {
      return null;
    }

    return { mapId: map?.d?.id, camera };
  },

  getHero(): RuntimeAuraCharacter | null {
    return toAuraCharacter(getRuntimeWindow().Engine?.hero);
  },

  getOther(characterId: string): RuntimeAuraCharacter | null {
    return toAuraCharacter(
      getRuntimeWindow().Engine?.others?.getById?.(characterId),
    );
  },

  /** The Margonem account of the hero or other a character tip belongs to. */
  getTipOwnerAccountId(object: CharacterTipUpdate["object"]): string | null {
    if (!isCanvasCharacter(object)) return null;
    const account = object.d?.account;

    return account === undefined ? null : String(account);
  },

  /** `.tip-layer`, where Tips.js appends the one `.tip-wrapper` it shows. */
  getTipLayer(): HTMLElement | null {
    return getRuntimeWindow().Engine?.interface?.get$tipLayer?.()?.[0] ?? null;
  },

  /** Rebuilds the cached tips of the hero and the given others. */
  refreshTips(otherIds: Iterable<string>): void {
    const engine = getRuntimeWindow().Engine;

    try {
      engine?.hero?.updateTip?.();

      for (const id of otherIds) engine?.others?.getById?.(id)?.tipUpdate?.();
    } catch (error) {
      console.warn("[CharacterAuras] Failed to refresh tooltips:", error);
    }
  },
};
