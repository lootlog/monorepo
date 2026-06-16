import type { Engine, Other } from "@lootlog/margonem";
import { useOthersStore } from "@/store/others.store";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { characterTooltipTransforms } from "./registry";
import type { CharacterTooltipKind, MargonemTooltipCharacter } from "./types";

type RuntimeWindow = Window &
  typeof globalThis & {
    Engine?: Partial<Engine> & {
      canvasTip?: {
        hide?: (event: unknown) => unknown;
        show?: (event: unknown, object: unknown) => unknown;
      };
    };
  };

type OriginalCreateStrTip = (...args: unknown[]) => string;
type OriginalCanvasTipHide = (event: unknown) => unknown;
type OriginalCanvasTipShow = (event: unknown, object: unknown) => unknown;

const patchedCreateStrTip = new WeakMap<
  MargonemTooltipCharacter,
  OriginalCreateStrTip
>();

let cleanupCurrentInstallation: (() => void) | null = null;
let originalCanvasTipHide: OriginalCanvasTipHide | null = null;
let originalCanvasTipShow: OriginalCanvasTipShow | null = null;
let lastOtherCanvasTipEvent: unknown = null;
const patchedCharacters = new Set<MargonemTooltipCharacter>();

function getRuntimeWindow(): RuntimeWindow {
  return window as RuntimeWindow;
}

function patchCreateStrTip(
  character: MargonemTooltipCharacter | undefined,
  kind: CharacterTooltipKind,
): boolean {
  if (!character?.createStrTip || patchedCreateStrTip.has(character)) {
    return false;
  }

  const originalCreateStrTip = character.createStrTip;

  patchedCreateStrTip.set(character, originalCreateStrTip);
  character.createStrTip = function patchedCharacterCreateStrTip(
    this: MargonemTooltipCharacter,
    ...args: unknown[]
  ) {
    const baseHtml = String(originalCreateStrTip.apply(this, args) ?? "");

    return characterTooltipTransforms.apply({
      kind,
      character: this,
      baseHtml,
      currentHtml: baseHtml,
    });
  };

  return true;
}

function restoreCreateStrTip(character: MargonemTooltipCharacter): void {
  const originalCreateStrTip = patchedCreateStrTip.get(character);
  if (!originalCreateStrTip) return;

  character.createStrTip = originalCreateStrTip;
  patchedCreateStrTip.delete(character);
}

function refreshCharacterTooltip(character: MargonemTooltipCharacter): void {
  try {
    character.updateTip?.();
    character.tipUpdate?.();
  } catch (error) {
    console.warn("[MargonemTooltips] Failed to refresh tooltip:", error);
  }
}

function patchOtherPrototype(other: MargonemTooltipCharacter): boolean {
  const prototype = Object.getPrototypeOf(other) as
    | (MargonemTooltipCharacter & { createStrTip?: OriginalCreateStrTip })
    | null;

  if (!prototype || typeof prototype.createStrTip !== "function") {
    return false;
  }

  const originalCreateStrTip = prototype.createStrTip;
  const prototypeAsCharacter = prototype as MargonemTooltipCharacter;

  if (patchedCreateStrTip.has(prototypeAsCharacter)) {
    return false;
  }

  patchedCreateStrTip.set(prototypeAsCharacter, originalCreateStrTip);
  prototype.createStrTip = function patchedOtherPrototypeCreateStrTip(
    this: MargonemTooltipCharacter,
    ...args: unknown[]
  ) {
    const baseHtml = String(originalCreateStrTip.apply(this, args) ?? "");

    return characterTooltipTransforms.apply({
      kind: "other",
      character: this,
      baseHtml,
      currentHtml: baseHtml,
    });
  };

  patchedCharacters.add(prototypeAsCharacter);
  return true;
}

function hasOwnCreateStrTip(character: MargonemTooltipCharacter): boolean {
  return Object.prototype.hasOwnProperty.call(character, "createStrTip");
}

function isPrototypePatched(character: MargonemTooltipCharacter): boolean {
  const prototype = Object.getPrototypeOf(
    character,
  ) as MargonemTooltipCharacter | null;

  return Boolean(prototype && patchedCreateStrTip.has(prototype));
}

function isOtherCanvasObject(object: unknown): object is Other {
  return (
    typeof object === "object" &&
    object !== null &&
    "canvasObjectType" in object &&
    object.canvasObjectType === "OTHER"
  );
}

function patchCanvasTip(runtimeWindow: RuntimeWindow): (() => void) | null {
  const canvasTip = runtimeWindow.Engine?.canvasTip;
  if (!canvasTip?.show || !canvasTip.hide || originalCanvasTipShow) {
    return null;
  }

  originalCanvasTipShow = canvasTip.show;
  originalCanvasTipHide = canvasTip.hide;

  canvasTip.show = (event, object) => {
    if (isOtherCanvasObject(object)) {
      lastOtherCanvasTipEvent = event;
      useCharacterTooltipCatchingGuildsStore.getState().setActiveOther(object);

      if (useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed) {
        patchOtherCharacterTooltip(object);
      }
    } else {
      lastOtherCanvasTipEvent = null;
      useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
    }

    return originalCanvasTipShow?.call(canvasTip, event, object);
  };

  canvasTip.hide = (event) => {
    lastOtherCanvasTipEvent = null;
    useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
    return originalCanvasTipHide?.call(canvasTip, event);
  };

  return () => {
    if (originalCanvasTipShow) {
      canvasTip.show = originalCanvasTipShow;
    }
    if (originalCanvasTipHide) {
      canvasTip.hide = originalCanvasTipHide;
    }

    originalCanvasTipShow = null;
    originalCanvasTipHide = null;
    lastOtherCanvasTipEvent = null;
  };
}

export function refreshCharacterTooltips(): void {
  const engine = getRuntimeWindow().Engine;
  if (!engine) return;

  if (engine.hero) {
    refreshCharacterTooltip(engine.hero);
  }

  for (const other of Object.values(useOthersStore.getState().othersById)) {
    refreshCharacterTooltip(other);
  }
}

export function patchOtherCharacterTooltip(other: Other): void {
  if (hasOwnCreateStrTip(other)) {
    if (patchCreateStrTip(other, "other")) {
      patchedCharacters.add(other);
    }
  } else if (!isPrototypePatched(other)) {
    patchOtherPrototype(other);
  }

  refreshCharacterTooltip(other);
}

export function refreshActiveOtherCanvasTooltip(): void {
  const activeOther =
    useCharacterTooltipCatchingGuildsStore.getState().activeOther;
  if (!activeOther) return;

  patchOtherCharacterTooltip(activeOther);

  const canvasTip = getRuntimeWindow().Engine?.canvasTip;
  if (!canvasTip?.show || !lastOtherCanvasTipEvent) return;

  canvasTip.show(lastOtherCanvasTipEvent, activeOther);
}

export function patchOtherCharacterTooltips(others: Other[]): void {
  for (const other of others) {
    patchOtherCharacterTooltip(other);
  }
}

export function installCharacterTooltipTransforms(): () => void {
  if (cleanupCurrentInstallation) {
    return cleanupCurrentInstallation;
  }

  const runtimeWindow = getRuntimeWindow();
  const engine = runtimeWindow.Engine;
  if (!engine) {
    return () => undefined;
  }
  const cleanupCanvasTip = patchCanvasTip(runtimeWindow);

  if (patchCreateStrTip(engine.hero, "hero") && engine.hero) {
    patchedCharacters.add(engine.hero);
    refreshCharacterTooltip(engine.hero);
  }

  patchOtherCharacterTooltips(
    Object.values(useOthersStore.getState().othersById),
  );

  cleanupCurrentInstallation = () => {
    cleanupCanvasTip?.();

    for (const character of patchedCharacters) {
      restoreCreateStrTip(character);
      refreshCharacterTooltip(character);
    }
    patchedCharacters.clear();

    cleanupCurrentInstallation = null;
  };

  return cleanupCurrentInstallation;
}
