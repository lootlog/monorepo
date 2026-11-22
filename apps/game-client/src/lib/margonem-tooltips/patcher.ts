import type { LegacyGameOther, Other } from "@lootlog/margonem/others";
import type { CharacterTipUpdate } from "@lootlog/margonem/tooltip";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { characterTooltipTransforms } from "./registry";
import {
  buildLegacyOtherTip,
  getLegacyOtherIdAt,
  getLegacyRuntimeOther,
  getRuntimeCanvasTip,
  isLegacyTooltipRuntimeAvailable,
  setLegacyOtherTip,
  subscribeCharacterTipUpdates,
  type RuntimeCanvasTip,
} from "@/lib/margonem-runtime/adapters/tooltip-runtime-adapter";

type OriginalCanvasTipHide = NonNullable<RuntimeCanvasTip["hide"]>;

type OriginalCanvasTipShow = NonNullable<RuntimeCanvasTip["show"]>;

let cleanupCurrentInstallation: (() => void) | null = null;

let originalCanvasTipHide: OriginalCanvasTipHide | null = null;

let originalCanvasTipShow: OriginalCanvasTipShow | null = null;

let lastOtherCanvasTipEvent: unknown = null;

let lastOtherCanvasTipObject: Other | null = null;

let shiftSectionDrawn = false;

const othersWithShiftSection = new Set<Other>();

function isOtherCanvasObject(object: unknown): object is Other {
  return (
    typeof object === "object" &&
    object !== null &&
    "canvasObjectType" in object &&
    object.canvasObjectType === "OTHER"
  );
}

function extendCharacterTip(update: CharacterTipUpdate): void {
  const other = update.object;

  if (!isOtherCanvasObject(other)) return;

  const html = characterTooltipTransforms.apply({
    character: other,
    interface: "ni",
    baseHtml: update.text,
    currentHtml: update.text,
  });

  if (html === update.text) return;

  update.text = html;

  if (useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed) {
    othersWithShiftSection.add(other);
  }
}

function rebuildOtherTip(other: Other): void {
  try {
    other.tipUpdate?.();
  } catch (error) {
    console.warn("[MargonemTooltips] Failed to refresh tooltip:", error);
  }
}

function patchCanvasTip(canvasTip: RuntimeCanvasTip): (() => void) | null {
  if (!canvasTip.show || !canvasTip.hide || originalCanvasTipShow) {
    return null;
  }

  originalCanvasTipShow = canvasTip.show;
  originalCanvasTipHide = canvasTip.hide;

  canvasTip.show = (event, object) => {
    if (isOtherCanvasObject(object)) {
      lastOtherCanvasTipEvent = event;
      lastOtherCanvasTipObject = object;

      if (useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed) {
        useCharacterTooltipCatchingGuildsStore
          .getState()
          .setActiveOther(object);
        rebuildOtherTip(object);
        shiftSectionDrawn = true;
      }
    } else {
      lastOtherCanvasTipEvent = null;
      lastOtherCanvasTipObject = null;
      shiftSectionDrawn = false;
      useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
    }

    return originalCanvasTipShow?.call(canvasTip, event, object);
  };

  canvasTip.hide = (event) => {
    lastOtherCanvasTipEvent = null;
    lastOtherCanvasTipObject = null;
    shiftSectionDrawn = false;
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
    lastOtherCanvasTipObject = null;
    shiftSectionDrawn = false;
  };
}

function removeShiftSections(): void {
  if (othersWithShiftSection.size === 0) return;

  const presentOthers = new Set<unknown>(
    Object.values(runtimeOtherHandles.getAll()),
  );

  const others = [...othersWithShiftSection];

  othersWithShiftSection.clear();

  for (const other of others) {
    if (presentOthers.has(other)) rebuildOtherTip(other);
  }
}

function redrawOtherCanvasTooltip(other: Other): void {
  const canvasTip = getRuntimeCanvasTip();

  if (!canvasTip?.show || !lastOtherCanvasTipEvent) return;

  canvasTip.show(lastOtherCanvasTipEvent, other);
}

function refreshActiveOtherCanvasTooltip(): void {
  const state = useCharacterTooltipCatchingGuildsStore.getState();
  const hoveredOther = state.activeOther ?? lastOtherCanvasTipObject;

  if (!state.isShiftPressed) {
    state.clearActiveOther();
    removeShiftSections();

    if (!shiftSectionDrawn || !hoveredOther) return;

    shiftSectionDrawn = false;
    rebuildOtherTip(hoveredOther);
    redrawOtherCanvasTooltip(hoveredOther);

    return;
  }

  if (!hoveredOther) return;

  state.setActiveOther(hoveredOther);
  shiftSectionDrawn = true;
  redrawOtherCanvasTooltip(hoveredOther);
}

let hoveredLegacyOtherId: string | null = null;

const legacyOtherIdsWithShiftSection = new Set<string>();

let legacyTooltipsInstalled = false;

function toTooltipOther(other: LegacyGameOther): Other {
  return { d: { ...other, id: String(other.id) } };
}

function setLegacyOtherShiftSection(id: string): void {
  const legacyOther = getLegacyRuntimeOther(id);
  const baseHtml = legacyOther ? buildLegacyOtherTip(legacyOther) : null;

  if (!legacyOther || baseHtml === null) return;

  const html = characterTooltipTransforms.apply({
    character: toTooltipOther(legacyOther),
    interface: "si",
    baseHtml,
    currentHtml: baseHtml,
  });

  if (html === baseHtml) return;

  setLegacyOtherTip(id, html);
  legacyOtherIdsWithShiftSection.add(id);
}

function removeLegacyShiftSections(): void {
  const ids = [...legacyOtherIdsWithShiftSection];

  legacyOtherIdsWithShiftSection.clear();

  for (const id of ids) {
    const legacyOther = getLegacyRuntimeOther(id);
    const baseHtml = legacyOther ? buildLegacyOtherTip(legacyOther) : null;

    if (baseHtml !== null) setLegacyOtherTip(id, baseHtml);
  }
}

function showLegacyOtherShiftSection(id: string): void {
  const legacyOther = getLegacyRuntimeOther(id);

  if (!legacyOther) return;

  const state = useCharacterTooltipCatchingGuildsStore.getState();

  if (String(state.activeOther?.d.id) !== id) {
    state.setActiveOther(toTooltipOther(legacyOther));
  }

  setLegacyOtherShiftSection(id);
}

function refreshActiveLegacyOtherTooltip(): void {
  const state = useCharacterTooltipCatchingGuildsStore.getState();

  if (!state.isShiftPressed) {
    state.clearActiveOther();
    removeLegacyShiftSections();

    return;
  }

  if (hoveredLegacyOtherId) showLegacyOtherShiftSection(hoveredLegacyOtherId);
}

function handleLegacyMouseOver(event: MouseEvent): void {
  const id = getLegacyOtherIdAt(event.target);

  if (id === hoveredLegacyOtherId) return;

  hoveredLegacyOtherId = id;

  if (!useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed) {
    return;
  }

  if (id) {
    showLegacyOtherShiftSection(id);
  } else {
    useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
  }
}

function installLegacyTooltips(): () => void {
  legacyTooltipsInstalled = true;
  window.addEventListener("mouseover", handleLegacyMouseOver, true);

  return () => {
    window.removeEventListener("mouseover", handleLegacyMouseOver, true);
    legacyTooltipsInstalled = false;
    hoveredLegacyOtherId = null;
    useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
    removeLegacyShiftSections();
  };
}

export function restoreLegacyShiftSections(otherIds: string[]): void {
  if (
    !legacyTooltipsInstalled ||
    !useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed
  ) {
    return;
  }

  for (const id of otherIds) {
    if (id === hoveredLegacyOtherId || legacyOtherIdsWithShiftSection.has(id)) {
      setLegacyOtherShiftSection(id);
    }
  }
}

export function refreshActiveOtherTooltip(): void {
  if (legacyTooltipsInstalled) {
    refreshActiveLegacyOtherTooltip();
  } else {
    refreshActiveOtherCanvasTooltip();
  }
}

export function installCharacterTooltipTransforms(): () => void {
  if (cleanupCurrentInstallation) {
    return cleanupCurrentInstallation;
  }

  const unsubscribeTipUpdates =
    subscribeCharacterTipUpdates(extendCharacterTip);

  if (!unsubscribeTipUpdates) {
    if (!isLegacyTooltipRuntimeAvailable()) return () => undefined;

    const cleanupLegacyTooltips = installLegacyTooltips();

    cleanupCurrentInstallation = () => {
      cleanupLegacyTooltips();
      cleanupCurrentInstallation = null;
    };

    return cleanupCurrentInstallation;
  }

  const canvasTip = getRuntimeCanvasTip();
  const cleanupCanvasTip = canvasTip ? patchCanvasTip(canvasTip) : null;

  cleanupCurrentInstallation = () => {
    unsubscribeTipUpdates();
    cleanupCanvasTip?.();
    removeShiftSections();

    cleanupCurrentInstallation = null;
  };

  return cleanupCurrentInstallation;
}
