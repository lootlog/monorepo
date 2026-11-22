import type { ApiEventCallback } from "@lootlog/margonem/api";
import type { LegacyGameOther, Other } from "@lootlog/margonem/others";
import type { CharacterTipUpdate } from "@lootlog/margonem/tooltip";
import { isObjectRecord } from "@lootlog/schema/records";

export type RuntimeCanvasTip = {
  hide?: (event: unknown) => unknown;
  show?: (event: unknown, object: unknown) => unknown;
};

type JQueryLike = {
  find?: (selector: string) => unknown;
};

type TooltipRuntimeWindow = Window & {
  $?: (element: Element) => JQueryLike;
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
    try {
      getRuntimeWindow().API?.removeCallbackFromEvent?.(event, handler);
    } catch {}
  };
}

const LEGACY_OTHER_ELEMENT_PREFIX = "other";

export function getLegacyOtherIdAt(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;

  const element = target.closest(".other");
  const id = element?.id;

  if (!id?.startsWith(LEGACY_OTHER_ELEMENT_PREFIX)) return null;

  return id.slice(LEGACY_OTHER_ELEMENT_PREFIX.length) || null;
}

export function getLegacyOtherElement(id: string): HTMLElement | null {
  return document.getElementById(`${LEGACY_OTHER_ELEMENT_PREFIX}${id}`);
}

export function isLegacyTooltipRuntimeAvailable(): boolean {
  const runtimeWindow = getRuntimeWindow();

  return !runtimeWindow.Engine && Boolean(runtimeWindow.g);
}

export function getLegacyRuntimeOther(id: string): LegacyGameOther | undefined {
  return getRuntimeWindow().g?.other?.[id];
}

export function buildLegacyOtherTip(other: LegacyGameOther): string | null {
  const buildTip = getRuntimeWindow().g?.tips?.other;

  return buildTip ? String(buildTip(other)) : null;
}

export function setLegacyOtherTip(id: string, html: string): void {
  getLegacyOtherElement(id)?.setAttribute("tip", html);
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
