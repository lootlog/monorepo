import type { ApiEventCallback } from "@lootlog/margonem/api";
import type { Other } from "@lootlog/margonem/others";
import type { CharacterTipUpdate } from "@lootlog/margonem/tooltip";
import { isObjectRecord } from "@lootlog/schema/records";

// CanvasTip forwards event/object to jQuery tipShow/tipHide; addons may wrap
// these calls. Preserve the foreign arguments and return values unchanged.
export type RuntimeCanvasTip = {
  hide?: (event: unknown) => unknown;
  show?: (event: unknown, object: unknown) => unknown;
};

// The found container passes directly to WhoIsHere.createTipWrapper, which
// invokes the native jQuery .tip extension; Lootlog does not inspect this value.
type JQueryLike = {
  find?: (selector: string) => unknown;
};

type TooltipRuntimeWindow = Window & {
  $?: (element: Element) => JQueryLike;
  API?: {
    addCallbackToEvent?: (event: string, callback: ApiEventCallback) => void;
    removeCallbackFromEvent?: (
      event: string,
      callback: ApiEventCallback,
    ) => void;
  };
  Engine?: {
    apiData?: { AFTER_CHARACTER_TIP_UPDATE?: string };
    canvasTip?: RuntimeCanvasTip;
    whoIsHere?: {
      createTipWrapper?: (tipContainer: unknown, value: Other) => void;
      getWhoIsHereOther?: (id: string) => { $?: JQueryLike } | undefined;
    };
  };
};

const getRuntimeWindow = (): TooltipRuntimeWindow => window;

export const getRuntimeCanvasTip = (): RuntimeCanvasTip | undefined => {
  return getRuntimeWindow().Engine?.canvasTip;
};

function isCharacterTipUpdate(value: unknown): value is CharacterTipUpdate {
  return isObjectRecord(value) && typeof value.text === "string";
}

/**
 * Subscribes to the tooltip html the game builds for every character tip:
 * the map canvas, the who-is-here list, the minimap and party members. The
 * game runs API handlers inside createStrTip without a guard, so a throwing
 * handler would break the native tooltip; the callback is isolated here.
 */
export function subscribeCharacterTipUpdates(
  callback: (update: CharacterTipUpdate) => void,
): (() => void) | null {
  const runtimeWindow = getRuntimeWindow();
  const event = runtimeWindow.Engine?.apiData?.AFTER_CHARACTER_TIP_UPDATE;
  const api = runtimeWindow.API;

  if (!event || !api?.addCallbackToEvent || !api.removeCallbackFromEvent) {
    return null;
  }

  const handler: ApiEventCallback = (eventData) => {
    if (!isCharacterTipUpdate(eventData)) return;

    try {
      callback(eventData);
    } catch (error) {
      console.warn("[MargonemTooltips] Failed to extend tooltip:", error);
    }
  };

  api.addCallbackToEvent(event, handler);

  return () => {
    // Api.removeCallbackFromEvent throws when the game already dropped it.
    try {
      getRuntimeWindow().API?.removeCallbackFromEvent?.(event, handler);
    } catch {
      // The handler is gone either way.
    }
  };
}

export function refreshWhoIsHereRuntimeTooltip(
  characterId: string,
  row: HTMLElement,
  other: Other,
): void {
  const runtimeWindow = getRuntimeWindow();
  const whoIsHere = runtimeWindow.Engine?.whoIsHere;
  const listEntry = whoIsHere?.getWhoIsHereOther?.(characterId);
  let tipContainer = listEntry?.$?.find?.(".tip-container");

  if (!tipContainer) {
    const element = row.querySelector(".tip-container");
    tipContainer =
      element && runtimeWindow.$ ? runtimeWindow.$(element) : element;
  }

  whoIsHere?.createTipWrapper?.(tipContainer, other);
}
