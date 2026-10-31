import type { ApiEventCallback } from "@lootlog/margonem/api";
import type { LegacyGameOther, Other } from "@lootlog/margonem/others";
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
  // SI keeps others in g.other and builds their tip html with g.tips.other,
  // which newOther defines on the first other it receives (elements.js).
  g?: {
    other?: Record<string, LegacyGameOther | undefined>;
    tips?: { other?: (other: LegacyGameOther) => string };
  };
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
    others?: { otherTipRefresh?: () => void };
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

const LEGACY_OTHER_ELEMENT_PREFIX = "other";

/** The SI other whose map element (`#other{id}.other`) contains `target`. */
export function getLegacyOtherIdAt(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;

  const element = target.closest(".other");
  const id = element?.id;

  if (!id?.startsWith(LEGACY_OTHER_ELEMENT_PREFIX)) return null;

  return id.slice(LEGACY_OTHER_ELEMENT_PREFIX.length) || null;
}

/**
 * Rebuilds the tooltip html NI caches on every other player, so a change in
 * what Lootlog adds to it shows on the next hover.
 */
export function refreshCanvasOtherTips(): void {
  try {
    getRuntimeWindow().Engine?.others?.otherTipRefresh?.();
  } catch (error) {
    console.warn("[MargonemTooltips] Failed to refresh tooltips:", error);
  }
}

/** Ids of the players SI keeps on the current map. */
export function getLegacyRuntimeOtherIds(): string[] {
  return Object.keys(getRuntimeWindow().g?.other ?? {});
}

export function isLegacyTooltipRuntimeAvailable(): boolean {
  const runtimeWindow = getRuntimeWindow();

  return !runtimeWindow.Engine && Boolean(runtimeWindow.g);
}

export function getLegacyRuntimeOther(id: string): LegacyGameOther | undefined {
  return getRuntimeWindow().g?.other?.[id];
}

/** The tip html SI builds for an other, before any Lootlog section. */
export function buildLegacyOtherTip(other: LegacyGameOther): string | null {
  const buildTip = getRuntimeWindow().g?.tips?.other;

  return buildTip ? String(buildTip(other)) : null;
}

/**
 * SI's Tip shows the hovered element's `tip` attribute and re-reads it every
 * 100 ms while the element stays hovered, so replacing the attribute also
 * updates a tip that is already on screen.
 */
export function setLegacyOtherTip(id: string, html: string): void {
  document
    .getElementById(`${LEGACY_OTHER_ELEMENT_PREFIX}${id}`)
    ?.setAttribute("tip", html);
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
