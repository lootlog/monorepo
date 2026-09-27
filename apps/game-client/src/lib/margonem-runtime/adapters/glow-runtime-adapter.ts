import { isObjectRecord as isObject } from "@lootlog/schema/records";
import type { Other, OtherHandle } from "@lootlog/margonem/others";
import type { CharacterTooltipCatchingGuildsEntry } from "@/store/character-tooltip-catching-guilds.store";

export const LOOTLOG_OTHER_GLOW_BLUE = "#3ed1de";

export const LOOTLOG_OTHER_GLOW_RED_ORANGE = "#ff5a2f";

export const LOOTLOG_OTHER_GLOW_UNKNOWN = "#e879f9";

export function getLootlogOtherGlowColor(
  entry: CharacterTooltipCatchingGuildsEntry | undefined,
  selectedGuildId: string,
): string {
  if (entry?.status !== "success") {
    return LOOTLOG_OTHER_GLOW_UNKNOWN;
  }

  return entry.guilds.some((guild) => guild.id === selectedGuildId)
    ? LOOTLOG_OTHER_GLOW_BLUE
    : LOOTLOG_OTHER_GLOW_RED_ORANGE;
}

/** What a glow reads from the game character it sits behind. */
type GlowMaster = {
  d: { id?: number | string | null; x?: number; y?: number };
  fw?: number;
  fh?: number;
  leftPosMod?: number;
  rx?: number;
  ry?: number;
  waterTopModify?: number;
};

type RuntimeOther = Other &
  GlowMaster & {
    imgLoaded?: boolean;
    update?: RuntimeOtherUpdate;
  };

// Other.update may be wrapped by another addon; preserve its return value.
type RuntimeOtherUpdate = (this: RuntimeOther, ...args: unknown[]) => unknown;

type RuntimeWindow = Window &
  typeof globalThis & {
    Engine?: {
      imgLoader?: {
        onload?: (
          path: string,
          options: false,
          beforeOnload: (image: HTMLImageElement) => void,
          afterOnload: (image: HTMLImageElement) => void,
        ) => void;
      };
      map?: {
        clipObject?: (
          left: number,
          top: number,
          width: number,
          height: number,
        ) => {
          backgroundPositionX: number;
          backgroundPositionY: number;
          height: number;
          left: number;
          top: number;
          width: number;
        } | null;
        offset?: [number, number];
        water?: Record<number, number>;
      };
      mapShift?: {
        getShift?: () => [number, number];
      };
      npcs?: {
        getById?: (id: number) => GlowMaster | undefined;
      };
      others?: {
        getDrawableList?: () => unknown[];
      };
    };
  };

type OriginalGetDrawableList = () => unknown[];

const MASK_PATH = "/img/mask.png";

function getRuntimeWindow(): RuntimeWindow {
  return window;
}

// OthersManager.getDrawableList mixes characters, pets, markers and glows.
// Classify only known native glow capabilities; retain every other object by identity.
function isNativeOtherGlowDrawable(drawable: unknown): boolean {
  if (!isObject(drawable)) return false;

  if (
    typeof drawable.getTypeObject === "function" &&
    typeof drawable.getColor === "function"
  ) {
    return true;
  }

  const master = drawable.master;

  if (!isObject(master)) return false;

  return (
    "d" in master &&
    isObject(master.d) &&
    "id" in master.d &&
    typeof drawable.draw === "function" &&
    typeof drawable.update === "function" &&
    (typeof drawable.updateColor === "function" ||
      typeof drawable.setAlpha === "function")
  );
}

type TintedMaskSource = (
  color: string,
  width: number,
  height: number,
) => HTMLCanvasElement | null;

/**
 * The game's character glow (`WhoIsHereGlow2`): a tinted mask 4 px larger
 * than the sprite, drawn just behind it.
 */
class CharacterGlow<Master extends GlowMaster> {
  private alpha = 1;
  private color: string;
  private drawMask: HTMLCanvasElement | null = null;
  private readonly getTintedMask: TintedMaskSource;
  private rx = 0;
  private ry = 0;

  d: { id: string; x?: number; y?: number };
  fw = 36;
  fh = 52;
  master: Master;

  constructor(master: Master, color: string, getTintedMask: TintedMaskSource) {
    this.master = master;
    this.color = color;
    this.getTintedMask = getTintedMask;
    this.d = { id: String(master.d.id) };
    this.update();
  }

  getColor(): string {
    return this.color;
  }

  updateColor(color: string): void {
    if (this.color === color) return;

    this.color = color;
    this.drawMask = null;
  }

  setAlpha(alpha: number): void {
    this.alpha = alpha;
  }

  getOrder(): number {
    return (this.master.ry ?? 0) + 0.1;
  }

  update(): void {
    this.rx = (this.master.rx ?? this.master.d.x ?? 0) - 0.025;
    this.ry = this.master.ry ?? this.master.d.y ?? 0;
    this.d.x = this.master.d.x;
    this.d.y = this.master.d.y;

    const fw = (this.master.fw ?? 32) + 4;
    const fh = (this.master.fh ?? 48) + 4;

    if (fw === this.fw && fh === this.fh) return;

    this.fw = fw;
    this.fh = fh;
    this.drawMask = null;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.update();

    const runtimeWindow = getRuntimeWindow();
    const engine = runtimeWindow.Engine;

    if (!engine?.map) return;

    this.drawMask ??= this.getTintedMask(this.color, this.fw, this.fh);

    const drawMask = this.drawMask;

    if (!drawMask) return;

    const mapOffset = engine.map.offset ?? [0, 0];
    const mapShift = engine.mapShift?.getShift?.() ?? [0, 0];

    const left = Math.round(
      this.rx * 32 +
        16 -
        this.fw / 2 -
        mapOffset[0] -
        mapShift[0] +
        (this.master.leftPosMod ?? 0),
    );

    const top = this.ry * 32 - this.fh + 32 - mapOffset[1] - mapShift[1];
    const waterPosition = Math.round(this.rx) + Math.round(this.ry) * 256;

    const topModified = Math.round(
      engine.map.water?.[waterPosition]
        ? top + (this.master.waterTopModify ?? 0)
        : top,
    );

    const clipImage = engine.map.clipObject?.(
      left,
      topModified,
      this.fw,
      this.fh,
    );

    const previousAlpha = ctx.globalAlpha;
    ctx.globalAlpha = previousAlpha * this.alpha;

    if (!clipImage) {
      ctx.drawImage(drawMask, left, topModified, this.fw, this.fh);
      ctx.globalAlpha = previousAlpha;

      return;
    }

    ctx.drawImage(
      drawMask,
      clipImage.backgroundPositionX,
      clipImage.backgroundPositionY,
      clipImage.width,
      clipImage.height,
      clipImage.left,
      clipImage.top,
      clipImage.width,
      clipImage.height,
    );
    ctx.globalAlpha = previousAlpha;
  }
}

/**
 * One mask request and one tinted canvas per (color, size) serve every glow,
 * of players and NPCs alike, and survive Shift releases.
 */
class TintedGlowMasks {
  private mask: HTMLImageElement | null = null;
  private requested = false;
  private readonly tinted = new Map<string, HTMLCanvasElement>();

  request(): void {
    if (this.requested) return;

    this.requested = true;

    const setMask = (image: HTMLImageElement) => {
      this.mask = image;
      this.tinted.clear();
    };

    const imgLoader = getRuntimeWindow().Engine?.imgLoader;

    if (imgLoader?.onload) {
      imgLoader.onload(MASK_PATH, false, () => undefined, setMask);

      return;
    }

    const image = new Image();
    image.onload = () => setMask(image);
    image.src = MASK_PATH;
  }

  /** Lets the next request try again after an earlier load never finished. */
  retryIfMissing(): void {
    if (!this.mask) this.requested = false;
  }

  release(): void {
    this.mask = null;
    this.requested = false;
    this.tinted.clear();
  }

  readonly get: TintedMaskSource = (color, width, height) => {
    const mask = this.mask;

    if (!mask) return null;

    const key = `${color}|${width}|${height}`;
    const cached = this.tinted.get(key);

    if (cached) return cached;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) return null;

    canvas.width = width;
    canvas.height = height;
    context.drawImage(mask, 0, 0, width, height);
    context.globalCompositeOperation = "source-in";
    context.fillStyle = color;
    context.fillRect(0, 0, width, height);
    this.tinted.set(key, canvas);

    return canvas;
  };
}

const tintedGlowMasks = new TintedGlowMasks();

export type NpcGlow = {
  draw: (context: CanvasRenderingContext2D) => void;
  getAlwaysDraw: () => boolean;
  getOrder: () => number;
  /** False once the NPC left the map; the glow then draws nothing. */
  isPresent: () => boolean;
  setAlpha: (alpha: number) => void;
};

/**
 * A glow behind an NPC's sprite, like the game's own group glow. It looks the
 * NPC up on every frame, so a respawned or moved NPC keeps its glow; add it to
 * the renderer each frame it should show.
 */
export const createNpcGlow = (npcId: number, color: string): NpcGlow => {
  const findNpc = () => getRuntimeWindow().Engine?.npcs?.getById?.(npcId);
  let glow: CharacterGlow<GlowMaster> | null = null;

  tintedGlowMasks.request();

  const resolve = () => {
    const npc = findNpc();

    if (!npc) return null;

    glow ??= new CharacterGlow(npc, color, tintedGlowMasks.get);
    glow.master = npc;

    return glow;
  };

  let alpha = 1;

  return {
    draw: (context) => {
      const current = resolve();

      if (!current) return;
      current.setAlpha(alpha);
      current.draw(context);
    },
    getAlwaysDraw: () => true,
    getOrder: () => resolve()?.getOrder() ?? 0,
    isPresent: () => findNpc() !== undefined,
    setAlpha: (next) => {
      alpha = next;
    },
  };
};

class LootlogOtherGlowManager {
  private cleanupDrawableListPatch: (() => void) | null = null;
  private readonly glowsByCharacterId = new Map<
    string,
    CharacterGlow<RuntimeOther>
  >();
  private nativeGlowSuppressed = false;
  private originalGetDrawableList: OriginalGetDrawableList | null = null;
  private readonly originalOtherUpdates = new WeakMap<
    RuntimeOther,
    RuntimeOtherUpdate
  >();

  install(): void {
    if (this.cleanupDrawableListPatch) return;

    const others = getRuntimeWindow().Engine?.others;

    if (!others?.getDrawableList) return;

    tintedGlowMasks.retryIfMissing();

    this.originalGetDrawableList = others.getDrawableList;
    // Engine calls this every rendered frame; build at most one array per call.
    others.getDrawableList = () => {
      const drawables = this.originalGetDrawableList?.call(others) ?? [];

      if (!this.nativeGlowSuppressed && this.glowsByCharacterId.size === 0) {
        return drawables;
      }

      const combined: unknown[] = [];

      for (let index = 0; index < drawables.length; index += 1) {
        const drawable = drawables[index];

        if (this.nativeGlowSuppressed && isNativeOtherGlowDrawable(drawable)) {
          continue;
        }

        combined.push(drawable);
      }

      for (const glow of this.glowsByCharacterId.values()) {
        glow.update();
        combined.push(glow);
      }

      return combined;
    };

    this.cleanupDrawableListPatch = () => {
      if (this.originalGetDrawableList) {
        others.getDrawableList = this.originalGetDrawableList;
      }

      this.originalGetDrawableList = null;
      this.cleanupDrawableListPatch = null;
    };
  }

  setNativeGlowSuppressed(nativeGlowSuppressed: boolean): void {
    if (this.nativeGlowSuppressed === nativeGlowSuppressed) return;

    this.nativeGlowSuppressed = nativeGlowSuppressed;
  }

  setGlow(other: OtherHandle, color: string): void {
    if (
      !other ||
      !("d" in other) ||
      !other.d ||
      other.d.id === undefined ||
      other.d.id === null
    )
      return;

    const characterId = String(other.d.id);
    const runtimeOther: RuntimeOther = other;
    const existingGlow = this.glowsByCharacterId.get(characterId);

    if (existingGlow) {
      if (existingGlow.master !== runtimeOther) {
        this.restoreOtherUpdate(existingGlow.master);
      }

      existingGlow.master = runtimeOther;
      existingGlow.updateColor(color);
      this.patchOtherUpdate(runtimeOther);
      existingGlow.update();

      return;
    }

    this.patchOtherUpdate(runtimeOther);
    tintedGlowMasks.request();
    this.glowsByCharacterId.set(
      characterId,
      new CharacterGlow(runtimeOther, color, tintedGlowMasks.get),
    );
  }

  removeGlow(characterId: string): void {
    const glow = this.glowsByCharacterId.get(characterId);

    if (!glow) return;

    this.restoreOtherUpdate(glow.master);
    this.glowsByCharacterId.delete(characterId);
  }

  clear(): void {
    for (const glow of this.glowsByCharacterId.values()) {
      this.restoreOtherUpdate(glow.master);
    }

    this.glowsByCharacterId.clear();
  }

  // Shift released: stop drawing and restore the game, keep shared masks.
  uninstall(): void {
    this.nativeGlowSuppressed = false;
    this.clear();
    this.cleanupDrawableListPatch?.();
  }

  cleanup(): void {
    this.uninstall();
    tintedGlowMasks.release();
  }

  getGlowColor(characterId: string): string | undefined {
    return this.glowsByCharacterId.get(characterId)?.getColor();
  }

  getGlowPosition(characterId: string): { x?: number; y?: number } | undefined {
    const glow = this.glowsByCharacterId.get(characterId);

    if (!glow) return undefined;

    return {
      x: glow.d.x,
      y: glow.d.y,
    };
  }

  getGlowOrder(characterId: string): number | undefined {
    return this.glowsByCharacterId.get(characterId)?.getOrder();
  }

  getGlowCount(): number {
    return this.glowsByCharacterId.size;
  }

  getNativeGlowSuppressed(): boolean {
    return this.nativeGlowSuppressed;
  }

  private patchOtherUpdate(other: RuntimeOther): void {
    if (this.originalOtherUpdates.has(other) || !other.update) return;

    const originalUpdate = other.update;

    const updateGlowForOther = (updatedOther: RuntimeOther) => {
      this.updateGlowForOther(updatedOther);
    };

    this.originalOtherUpdates.set(other, originalUpdate);
    other.update = function lootlogOtherUpdatePatch(...args) {
      const result = originalUpdate.apply(this, args);
      updateGlowForOther(this);

      return result;
    };
  }

  private restoreOtherUpdate(other: RuntimeOther): void {
    const originalUpdate = this.originalOtherUpdates.get(other);

    if (!originalUpdate) return;

    other.update = originalUpdate;
    this.originalOtherUpdates.delete(other);
  }

  private updateGlowForOther(other: RuntimeOther): void {
    const glow = this.glowsByCharacterId.get(String(other.d.id));

    if (!glow) return;

    glow.master = other;
    glow.update();
  }
}

export const lootlogOtherGlowManager = new LootlogOtherGlowManager();
