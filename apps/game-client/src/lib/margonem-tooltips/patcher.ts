import type { LegacyGameOther, Other } from "@lootlog/margonem/others";
import type { CharacterTipUpdate } from "@lootlog/margonem/tooltip";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { characterTooltipTransforms } from "./registry";
import {
  buildLegacyOtherTip,
  getLegacyOtherIdAt,
  getLegacyRuntimeOther,
  getLegacyRuntimeOtherIds,
  getRuntimeCanvasTip,
  isLegacyTooltipRuntimeAvailable,
  refreshCanvasOtherTips,
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

function refreshActiveOtherCanvasTooltip(): void {
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

// SI has no tooltip hook: its Tip shows the `tip` attribute of the hovered
// `#other{id}` element, so Lootlog rewrites that attribute instead.
let hoveredLegacyOtherId: string | null = null;

const legacyOtherIdsWithShiftSection = new Set<string>();

let legacyTooltipsInstalled = false;

function toTooltipOther(other: LegacyGameOther): Other {
  return { d: { ...other, id: String(other.id) } };
}

/**
 * The tip SI builds for an other and the same tip with every transform that
 * applies right now, or null while SI cannot build it. Without Shift only the
 * always-on sections apply.
 */
function buildLegacyOtherTips(
  id: string,
): { baseHtml: string; html: string } | null {
  const legacyOther = getLegacyRuntimeOther(id);
  const baseHtml = legacyOther ? buildLegacyOtherTip(legacyOther) : null;

  if (!legacyOther || baseHtml === null) return null;

  const html = characterTooltipTransforms.apply({
    character: toTooltipOther(legacyOther),
    interface: "si",
    baseHtml,
    currentHtml: baseHtml,
  });

  return { baseHtml, html };
}

function setLegacyOtherShiftSection(id: string): void {
  const tips = buildLegacyOtherTips(id);

  if (!tips || tips.html === tips.baseHtml) return;

  setLegacyOtherTip(id, tips.html);
  legacyOtherIdsWithShiftSection.add(id);
}

/** Releasing Shift keeps the always-on sections, dropping the Shift one. */
function removeLegacyShiftSections(): void {
  const ids = [...legacyOtherIdsWithShiftSection];

  legacyOtherIdsWithShiftSection.clear();

  for (const id of ids) {
    const tips = buildLegacyOtherTips(id);

    // An other that left the map took its element with it.
    if (tips) setLegacyOtherTip(id, tips.html);
  }
}

/**
 * Uninstalling puts back the game's own tip on every other: always-on
 * sections were written outside Shift, so no tracked set covers them.
 */
function restoreLegacyNativeTips(): void {
  legacyOtherIdsWithShiftSection.clear();

  for (const id of getLegacyRuntimeOtherIds()) {
    const tips = buildLegacyOtherTips(id);

    if (tips) setLegacyOtherTip(id, tips.baseHtml);
  }
}

function showLegacyOtherShiftSection(id: string): void {
  const legacyOther = getLegacyRuntimeOther(id);

  if (!legacyOther) return;

  useCharacterTooltipCatchingGuildsStore
    .getState()
    .setActiveOther(toTooltipOther(legacyOther));
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
  // Capture runs before Tip's own delegated mouseover reads the attribute.
  window.addEventListener("mouseover", handleLegacyMouseOver, true);

  return () => {
    window.removeEventListener("mouseover", handleLegacyMouseOver, true);
    legacyTooltipsInstalled = false;
    hoveredLegacyOtherId = null;
    useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
    restoreLegacyNativeTips();
  };
}

/**
 * SI's newOther rewrites `#other{id}[tip]` on full updates, dropping the
 * section. Called after the game applied an `other` packet, so it re-adds the
 * section to the players that still need it.
 */
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

/**
 * Re-applies the always-on tooltip sections after what they show changed.
 * NI rebuilds the html it caches on every other; SI rewrites the `tip`
 * attribute of the given others, or of every other on the map. SI's newOther
 * rewrites that attribute on full updates, so callers pass the ids of each
 * `other` packet that needs its section back.
 */
export function refreshCharacterTooltips(otherIds?: readonly string[]): void {
  if (!cleanupCurrentInstallation) return;

  if (!legacyTooltipsInstalled) {
    refreshCanvasOtherTips();

    return;
  }

  for (const id of otherIds ?? getLegacyRuntimeOtherIds()) {
    const tips = buildLegacyOtherTips(id);

    if (tips) setLegacyOtherTip(id, tips.html);
  }
}

/** Adds or removes the Shift section on the tooltip under the cursor. */
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
    // NI caches each other's tip html; rebuilt without the subscription, the
    // cache drops always-on sections such as the champion crest.
    refreshCanvasOtherTips();

    cleanupCurrentInstallation = null;
  };

  return cleanupCurrentInstallation;
}
