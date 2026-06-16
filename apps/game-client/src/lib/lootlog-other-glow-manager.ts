import type { Other } from "@lootlog/margonem/others";

export const LOOTLOG_OTHER_GLOW_BLUE = "#3ed1de";
export const LOOTLOG_OTHER_GLOW_RED_ORANGE = "#ff5a2f";

type RuntimeOther = Other & {
  d: Other["d"] & {
    x?: number;
    y?: number;
  };
  fw?: number;
  fh?: number;
  imgLoaded?: boolean;
  rx?: number;
  ry?: number;
  waterTopModify?: number;
};

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
        water?: Record<string, unknown>;
      };
      mapShift?: {
        getShift?: () => [number, number];
      };
      others?: {
        getDrawableList?: () => unknown[];
      };
    };
  };

type OriginalGetDrawableList = () => unknown[];

const MASK_PATH = "/img/mask.png";

function getRuntimeWindow(): RuntimeWindow {
  return window as RuntimeWindow;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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

class LootlogOtherGlow {
  private color: string;
  private drawMask: HTMLCanvasElement | null = null;
  private mask: HTMLImageElement | null = null;
  private maskLoaded = false;
  private rx = 0;
  private ry = 0;

  d: { id: string; x?: number; y?: number };
  fw = 36;
  fh = 52;
  master: RuntimeOther;

  constructor(master: RuntimeOther, color: string) {
    this.master = master;
    this.color = color;
    this.d = { id: String(master.d.id) };
    this.update();
    this.createImage();
  }

  getColor(): string {
    return this.color;
  }

  updateColor(color: string): void {
    if (this.color === color) return;

    this.color = color;
    this.drawMask = null;
  }

  getOrder(): number {
    return (this.master.ry ?? 0) + 0.1;
  }

  update(): void {
    this.rx = (this.master.rx ?? this.master.d.x ?? 0) - 0.025;
    this.ry = this.master.ry ?? this.master.d.y ?? 0;
    this.d.x = this.master.d.x;
    this.d.y = this.master.d.y;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.update();

    const runtimeWindow = getRuntimeWindow();
    const engine = runtimeWindow.Engine;
    if (!this.maskLoaded || !this.createMaskColor() || !engine?.map) return;

    const mapOffset = engine.map.offset ?? [0, 0];
    const mapShift = engine.mapShift?.getShift?.() ?? [0, 0];
    const left = Math.round(
      this.rx * 32 + 16 - this.fw / 2 - mapOffset[0] - mapShift[0],
    );
    const top = this.ry * 32 - this.fh + 32 - mapOffset[1] - mapShift[1];
    const waterPosition = Math.round(this.rx) + Math.round(this.ry) * 256;
    const topModified = Math.round(
      engine.map.water?.[waterPosition]
        ? top + (this.master.waterTopModify ?? 0)
        : top,
    );
    const drawMask = this.drawMask;
    if (!drawMask) return;

    const clipImage = engine.map.clipObject?.(
      left,
      topModified,
      this.fw,
      this.fh,
    );

    if (!clipImage) {
      ctx.drawImage(drawMask, left, topModified, this.fw, this.fh);
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
  }

  private createImage(): void {
    const imgLoader = getRuntimeWindow().Engine?.imgLoader;
    const beforeOnload = (image: HTMLImageElement) => {
      this.fw = (this.master.fw ?? 32) + 4;
      this.fh = (this.master.fh ?? 48) + 4;
      this.mask = image;
    };
    const afterOnload = (image: HTMLImageElement) => {
      this.mask = image;
      this.maskLoaded = true;
      this.drawMask = null;
    };

    if (imgLoader?.onload) {
      imgLoader.onload(MASK_PATH, false, beforeOnload, afterOnload);
      return;
    }

    const image = new Image();
    image.onload = () => {
      beforeOnload(image);
      afterOnload(image);
    };
    image.src = MASK_PATH;
  }

  private createMaskColor(): HTMLCanvasElement | null {
    if (this.drawMask || !this.mask) {
      return this.drawMask;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    canvas.width = this.fw;
    canvas.height = this.fh;
    context.drawImage(this.mask, 0, 0, this.fw, this.fh);
    context.globalCompositeOperation = "source-in";
    context.fillStyle = this.color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    this.drawMask = canvas;

    return this.drawMask;
  }
}

class LootlogOtherGlowManager {
  private cleanupDrawableListPatch: (() => void) | null = null;
  private readonly glowsByCharacterId = new Map<string, LootlogOtherGlow>();
  private nativeGlowSuppressed = false;
  private originalGetDrawableList: OriginalGetDrawableList | null = null;

  install(): void {
    if (this.cleanupDrawableListPatch) return;

    const others = getRuntimeWindow().Engine?.others;
    if (!others?.getDrawableList) return;

    this.originalGetDrawableList = others.getDrawableList;
    others.getDrawableList = () => {
      this.updateGlows();

      return [
        ...this.getBaseDrawableList(others),
        ...this.glowsByCharacterId.values(),
      ];
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
    this.nativeGlowSuppressed = nativeGlowSuppressed;
  }

  setGlow(other: Other, color: string): void {
    const characterId = String(other.d.id);
    const existingGlow = this.glowsByCharacterId.get(characterId);

    if (existingGlow) {
      existingGlow.master = other as RuntimeOther;
      existingGlow.updateColor(color);
      return;
    }

    this.glowsByCharacterId.set(
      characterId,
      new LootlogOtherGlow(other as RuntimeOther, color),
    );
  }

  removeGlow(characterId: string): void {
    this.glowsByCharacterId.delete(characterId);
  }

  clear(): void {
    this.glowsByCharacterId.clear();
  }

  cleanup(): void {
    this.nativeGlowSuppressed = false;
    this.clear();
    this.cleanupDrawableListPatch?.();
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

  private getBaseDrawableList(others: {
    getDrawableList?: () => unknown[];
  }): unknown[] {
    const drawables = this.originalGetDrawableList?.call(others) ?? [];
    if (!this.nativeGlowSuppressed) {
      return drawables;
    }

    return drawables.filter((drawable) => !isNativeOtherGlowDrawable(drawable));
  }

  private updateGlows(): void {
    for (const glow of this.glowsByCharacterId.values()) {
      glow.update();
    }
  }
}

export const lootlogOtherGlowManager = new LootlogOtherGlowManager();
