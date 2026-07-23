import type { Other } from "@lootlog/margonem/others";
import { useOthersStore } from "@/store/others.store";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { characterTooltipTransforms } from "./registry";
import type { CharacterTooltipKind, MargonemTooltipCharacter } from "./types";
import {
  getRuntimeCanvasTip,
  getRuntimeHeroTooltipOwner,
  type RuntimeCanvasTip,
} from "@/lib/margonem-runtime/adapters/tooltip-runtime-adapter";

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
const patchedOtherPrototypes = new Set<MargonemTooltipCharacter>();

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
  patchedOtherPrototypes.add(prototypeAsCharacter);
  return true;
}

function prunePatchedCharacters(): void {
  const hero = getRuntimeHeroTooltipOwner();
  const currentOthers = Object.values(
    useOthersStore.getState().othersById,
  ) as MargonemTooltipCharacter[];
  const retainedCharacters = new Set<MargonemTooltipCharacter>(currentOthers);
  if (hero) {
    retainedCharacters.add(hero);
  }
  const retainedPrototypes = new Set(
    currentOthers.map(
      (other) => Object.getPrototypeOf(other) as MargonemTooltipCharacter,
    ),
  );

  for (const character of patchedCharacters) {
    const isRetainedPrototype =
      patchedOtherPrototypes.has(character) &&
      retainedPrototypes.has(character);
    if (retainedCharacters.has(character) || isRetainedPrototype) {
      continue;
    }

    restoreCreateStrTip(character);
    patchedCharacters.delete(character);
    patchedOtherPrototypes.delete(character);
  }
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

function patchCanvasTip(canvasTip: RuntimeCanvasTip): (() => void) | null {
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
    useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();

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
  prunePatchedCharacters();
  const hero = getRuntimeHeroTooltipOwner();

  if (hero) {
    if (patchCreateStrTip(hero, "hero")) {
      patchedCharacters.add(hero);
    }

    if (patchedCreateStrTip.has(hero)) {
      refreshCharacterTooltip(hero);
    }
  }

  for (const other of Object.values(runtimeOtherHandles.getAll())) {
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

  const canvasTip = getRuntimeCanvasTip();
  if (!canvasTip?.show || !lastOtherCanvasTipEvent) return;

  canvasTip.show(lastOtherCanvasTipEvent, activeOther);
}

export function patchOtherCharacterTooltips(others: Other[]): void {
  prunePatchedCharacters();
  for (const other of others) {
    patchOtherCharacterTooltip(other);
  }
}

export function installCharacterTooltipTransforms(): () => void {
  if (cleanupCurrentInstallation) {
    return cleanupCurrentInstallation;
  }

  const hero = getRuntimeHeroTooltipOwner();
  const canvasTip = getRuntimeCanvasTip();
  if (!hero && !canvasTip) {
    return () => undefined;
  }
  const cleanupCanvasTip = canvasTip ? patchCanvasTip(canvasTip) : null;
  const unsubscribeOthersStore = useOthersStore.subscribe(
    prunePatchedCharacters,
  );

  if (hero && patchCreateStrTip(hero, "hero")) {
    patchedCharacters.add(hero);
    refreshCharacterTooltip(hero);
  }

  patchOtherCharacterTooltips(Object.values(runtimeOtherHandles.getAll()));

  cleanupCurrentInstallation = () => {
    unsubscribeOthersStore();
    cleanupCanvasTip?.();

    for (const character of patchedCharacters) {
      restoreCreateStrTip(character);
      refreshCharacterTooltip(character);
    }
    patchedCharacters.clear();
    patchedOtherPrototypes.clear();

    cleanupCurrentInstallation = null;
  };

  return cleanupCurrentInstallation;
}
