import type { Other } from "@lootlog/margonem/others";
import type { CharacterTipUpdate } from "@lootlog/margonem/tooltip";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { characterTooltipTransforms } from "./registry";
import {
  getRuntimeCanvasTip,
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

// True while the tooltip currently drawn on the canvas carries the Shift-only
// section, so releasing Shift redraws only the tooltips that still show it.
let shiftSectionDrawn = false;

// Others whose cached tooltip html gained the Shift-only section. The game
// keeps that html in `other.tip` until something rebuilds it, so releasing
// Shift rebuilds exactly these instead of leaving the section on them.
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
    baseHtml: update.text,
    currentHtml: update.text,
  });

  if (html === update.text) return;

  update.text = html;

  if (useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed) {
    othersWithShiftSection.add(other);
  }
}

/** Rebuilds the html the game caches in `other.tip` for the canvas tooltip. */
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

  // Others that left the map are no longer drawn, so only the present ones
  // need their html rebuilt.
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

export function refreshActiveOtherCanvasTooltip(): void {
  const state = useCharacterTooltipCatchingGuildsStore.getState();
  const hoveredOther = state.activeOther ?? lastOtherCanvasTipObject;

  if (!state.isShiftPressed) {
    state.clearActiveOther();
    removeShiftSections();

    if (!shiftSectionDrawn || !hoveredOther) return;

    // Releasing Shift must drop the appended section from the tooltip that is
    // still on screen, so rebuild its html and redraw the visible tip.
    shiftSectionDrawn = false;
    rebuildOtherTip(hoveredOther);
    redrawOtherCanvasTooltip(hoveredOther);

    return;
  }

  if (!hoveredOther) return;

  state.setActiveOther(hoveredOther);
  shiftSectionDrawn = true;
  // The patched show rebuilds the cached html before drawing it.
  redrawOtherCanvasTooltip(hoveredOther);
}

export function installCharacterTooltipTransforms(): () => void {
  if (cleanupCurrentInstallation) {
    return cleanupCurrentInstallation;
  }

  const unsubscribeTipUpdates =
    subscribeCharacterTipUpdates(extendCharacterTip);

  if (!unsubscribeTipUpdates) {
    return () => undefined;
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
