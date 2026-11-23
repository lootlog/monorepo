import type { CharacterTipUpdate } from "@lootlog/margonem/tooltip";

export type RuntimeCharacterFrame = {
  image: CanvasImageSource;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
};

export type RuntimeAuraCharacter = {
  frame: RuntimeCharacterFrame;
  order: number;
  feetHeight: number;
};

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

type RuntimeCanvasCharacter = {
  imgLoaded?: boolean;
  fh?: number;
  ry?: number;
  d?: { account?: number | string; id?: number | string; y?: number };
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
    rajMassObjectHide?: {
      checkMassObjectsHide?: (character: RuntimeCanvasCharacter) => boolean;
    };
    rajCharacterImageChangerManager?: {
      checkHideObject?: (character: RuntimeCanvasCharacter) => boolean;
    };
    interface?: { get$tipLayer?: () => ArrayLike<HTMLElement> | undefined };
  };
};

const getRuntimeWindow = (): AuraRuntimeWindow => window;

type DrawImageCoordinates =
  | [dx: number, dy: number]
  | [dx: number, dy: number, dw: number, dh: number]
  | [
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      dx: number,
      dy: number,
      dw: number,
      dh: number,
    ];

let recorded: RuntimeCharacterFrame | null = null;

const recorder = {
  globalAlpha: 1,
  drawImage(image: CanvasImageSource, ...coordinates: DrawImageCoordinates) {
    if (coordinates.length !== 8) return;

    const [sx, sy, sw, sh, dx, dy] = coordinates;

    if (recorded && recorded.sh >= sh) return;
    recorded = { image, sx, sy, sw, sh, dx, dy };
  },
  fillRect() {},
  strokeRect() {},
  fillText() {},
  save() {},
  restore() {},
} satisfies CharacterIconContext;

function takeRecordedFrame(): RuntimeCharacterFrame | null {
  const frame = recorded;
  recorded = null;

  return frame;
}

function isCanvasCharacter(
  object: CharacterTipUpdate["object"],
): object is RuntimeCanvasCharacter {
  return typeof object === "object" && object !== null;
}

function hasPixels(image: CanvasImageSource): boolean {
  if (image instanceof HTMLImageElement) {
    return image.complete && image.naturalWidth > 0;
  }

  if ("width" in image && Number.isFinite(image.width)) {
    return Number(image.width) > 0 && Number(image.height) > 0;
  }

  return true;
}

function captureCharacterFrame(
  character: RuntimeCanvasCharacter,
): RuntimeCharacterFrame | null {
  if (!character.imgLoaded || !character.drawIcon) return null;

  recorded = null;
  character.drawIcon(recorder, true);
  const frame = takeRecordedFrame();

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

function isHiddenByGame(character: RuntimeCanvasCharacter): boolean {
  const engine = getRuntimeWindow().Engine;

  return Boolean(
    engine?.rajCharacterHide?.checkHideObject?.(character) ||
    engine?.rajMassObjectHide?.checkMassObjectsHide?.(character) ||
    engine?.rajCharacterImageChangerManager?.checkHideObject?.(character),
  );
}

function toAuraCharacter(
  character: RuntimeCanvasCharacter | undefined,
): RuntimeAuraCharacter | null {
  if (!character || isHiddenByGame(character)) return null;

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

export const auraRuntimeAdapter = {
  isAvailable(): boolean {
    return Boolean(getRuntimeWindow().Engine?.hero);
  },

  getView(): { mapId?: number; camera: readonly [number, number] } | null {
    const runtimeWindow = getRuntimeWindow();
    const map = runtimeWindow.Engine?.map;
    const camera = map?.getOffset?.();

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

  getTipOwner(
    object: CharacterTipUpdate["object"],
  ): { accountId: string; characterId: string } | null {
    if (!isCanvasCharacter(object)) return null;
    const account = object.d?.account;
    const id = object.d?.id;

    return account === undefined || id === undefined
      ? null
      : { accountId: String(account), characterId: String(id) };
  },

  getTipLayer(): HTMLElement | null {
    return getRuntimeWindow().Engine?.interface?.get$tipLayer?.()?.[0] ?? null;
  },

  refreshTips(otherIds: Iterable<string>, hero: boolean): void {
    const engine = getRuntimeWindow().Engine;

    try {
      if (hero) engine?.hero?.updateTip?.();

      for (const id of otherIds) engine?.others?.getById?.(id)?.tipUpdate?.();
    } catch (error) {
      console.warn("[CharacterAuras] Failed to refresh tooltips:", error);
    }
  },
};
