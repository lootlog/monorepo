import type { Engine, Other } from "@lootlog/margonem";
import { useOthersStore } from "@/store/others.store";
import { characterTooltipTransforms } from "./registry";
import type { CharacterTooltipKind, MargonemTooltipCharacter } from "./types";

type RuntimeWindow = Window &
  typeof globalThis & {
    Engine?: Partial<Engine>;
  };

type OriginalCreateStrTip = (...args: unknown[]) => string;

const patchedCreateStrTip = new WeakMap<
  MargonemTooltipCharacter,
  OriginalCreateStrTip
>();

let cleanupCurrentInstallation: (() => void) | null = null;
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

  if (patchCreateStrTip(engine.hero, "hero") && engine.hero) {
    patchedCharacters.add(engine.hero);
    refreshCharacterTooltip(engine.hero);
  }

  patchOtherCharacterTooltips(
    Object.values(useOthersStore.getState().othersById),
  );

  cleanupCurrentInstallation = () => {
    for (const character of patchedCharacters) {
      restoreCreateStrTip(character);
      refreshCharacterTooltip(character);
    }
    patchedCharacters.clear();

    cleanupCurrentInstallation = null;
  };

  return cleanupCurrentInstallation;
}
