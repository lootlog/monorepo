import type { Other } from "@lootlog/margonem/others";
import { useEffect, useEffectEvent, useRef } from "react";
import { getLootlogOtherGlowColor } from "@/lib/lootlog-other-glow-manager";
import { patchOtherCharacterTooltip } from "@/lib/margonem-tooltips/patcher";
import { isConcreteLootlogGuildId } from "@/lib/selected-lootlog-guild";
import { useSelectedLootlogGuildId } from "@/hooks/use-selected-lootlog-guild";
import {
  getOtherCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";

const HIGHLIGHT_CLASS = "ll-who-is-here-lootlog-highlight";
const STYLE_ELEMENT_ID = "ll-who-is-here-lootlog-style";
const WHO_IS_HERE_ROOT_SELECTOR = ".whoishere-window";
const WHO_IS_HERE_ROW_SELECTOR = ".whoishere-window .one-other[data-id]";
const WHO_IS_HERE_COLOR_PROPERTY = "--ll-who-is-here-lootlog-color";
const WHO_IS_HERE_DISCOVERY_INTERVAL_MS = 250;

type JQueryLike = {
  find?: (selector: string) => unknown;
};

type RuntimeWhoIsHere = {
  createTipWrapper?: (tipContainer: unknown, other: Other) => void;
  getWhoIsHereOther?: (id: string) => { $?: JQueryLike } | undefined;
};

type RuntimeEngine = Window["Engine"] & {
  whoIsHere?: RuntimeWhoIsHere;
};

type RuntimeWindow = Window &
  typeof globalThis & {
    $?: (element: Element) => JQueryLike;
    Engine?: RuntimeEngine;
  };

function getRuntimeWindow(): RuntimeWindow {
  return window as RuntimeWindow;
}

function getWhoIsHereRows(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(WHO_IS_HERE_ROW_SELECTOR),
  );
}

function clearRowHighlight(row: HTMLElement): void {
  row.classList.remove(HIGHLIGHT_CLASS);
  row.style.removeProperty(WHO_IS_HERE_COLOR_PROPERTY);
}

function setRowHighlight(row: HTMLElement, color: string): void {
  row.classList.add(HIGHLIGHT_CLASS);
  row.style.setProperty(WHO_IS_HERE_COLOR_PROPERTY, color);
}

function installStyle(): () => void {
  const existingStyle = document.getElementById(STYLE_ELEMENT_ID);
  if (existingStyle) {
    return () => undefined;
  }

  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} .center,
    .${HIGHLIGHT_CLASS} .name .inner,
    .${HIGHLIGHT_CLASS} .lvl {
      color: var(${WHO_IS_HERE_COLOR_PROPERTY}) !important;
    }
  `;
  document.head.append(style);

  return () => {
    style.remove();
  };
}

function getRowCharacterId(row: HTMLElement): string | null {
  const characterId = row.dataset.id;
  return characterId ? String(characterId) : null;
}

function getRowOther(
  row: HTMLElement,
  othersById: Record<string, Other | undefined>,
  runtimeOthersById?: Record<string, Other | undefined>,
): Other | null {
  const characterId = getRowCharacterId(row);
  if (!characterId) return null;

  const fallbackOthersById =
    runtimeOthersById ?? getRuntimeWindow().Engine?.others?.check?.();

  return othersById[characterId] ?? fallbackOthersById?.[characterId] ?? null;
}

function getWhoIsHereTipContainer(
  characterId: string,
  row: HTMLElement,
): unknown {
  const runtimeWindow = getRuntimeWindow();
  const whoIsHere = runtimeWindow.Engine?.whoIsHere;
  const listEntry = whoIsHere?.getWhoIsHereOther?.(characterId);
  const tipContainerFromEntry = listEntry?.$?.find?.(".tip-container");
  if (tipContainerFromEntry) {
    return tipContainerFromEntry;
  }

  const tipContainer = row.querySelector(".tip-container");
  if (tipContainer && runtimeWindow.$) {
    return runtimeWindow.$(tipContainer);
  }

  return tipContainer;
}

function refreshWhoIsHereTooltip(row: HTMLElement, other: Other): void {
  const characterId = getRowCharacterId(row);
  if (!characterId) return;

  patchOtherCharacterTooltip(other);
  getRuntimeWindow().Engine?.whoIsHere?.createTipWrapper?.(
    getWhoIsHereTipContainer(characterId, row),
    other,
  );
}

function getHoverRow(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;

  return target.closest<HTMLElement>(WHO_IS_HERE_ROW_SELECTOR);
}

function getEscapedSelectorValue(value: string): string {
  return (
    globalThis.CSS?.escape?.(value) ??
    value.replace(/["\\]/g, (character) => `\\${character}`)
  );
}

function isMovingInsideRow(
  row: HTMLElement,
  relatedTarget: EventTarget | null,
): boolean {
  return relatedTarget instanceof Node && row.contains(relatedTarget);
}

export function useWhoIsHereLootlogHighlight(): void {
  const hoveredRowRef = useRef<HTMLElement | null>(null);
  const entriesByKey = useCharacterTooltipCatchingGuildsStore(
    (state) => state.entriesByKey,
  );
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );
  const activeTarget = useCharacterTooltipCatchingGuildsStore(
    (state) => state.activeTarget,
  );
  const othersById = useOthersStore((state) => state.othersById);
  const ownersByCharacterKey = useOnlineCharacterOwnersStore(
    (state) => state.ownersByCharacterKey,
  );
  const selectedGuildId = useSelectedLootlogGuildId();
  const refreshRows = useEffectEvent(() => {
    const rows = getWhoIsHereRows();
    const runtimeOthersById = getRuntimeWindow().Engine?.others?.check?.();

    if (!isShiftPressed || !isConcreteLootlogGuildId(selectedGuildId)) {
      for (const row of rows) {
        clearRowHighlight(row);
      }
      return;
    }

    for (const row of rows) {
      const other = getRowOther(row, othersById, runtimeOthersById);
      const target = other ? getOtherCatchingGuildsTarget(other) : null;
      const entry = target ? entriesByKey[target.key] : undefined;

      if (!other) {
        clearRowHighlight(row);
        continue;
      }

      setRowHighlight(row, getLootlogOtherGlowColor(entry, selectedGuildId));
    }
  });

  useEffect(() => {
    const cleanupStyle = installStyle();

    return () => {
      cleanupStyle();

      for (const row of getWhoIsHereRows()) {
        clearRowHighlight(row);
      }
    };
  }, []);

  useEffect(() => {
    if (!isShiftPressed || !isConcreteLootlogGuildId(selectedGuildId)) {
      return;
    }

    let animationFrameId: number | null = null;
    const scheduleMutationRefresh = () => {
      if (animationFrameId !== null) return;

      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null;
        refreshRows();
      });
    };
    const observer = new MutationObserver(scheduleMutationRefresh);
    let discoveryIntervalId: number | null = null;
    const observeWhoIsHereRoot = () => {
      const whoIsHereRoot = document.querySelector<HTMLElement>(
        WHO_IS_HERE_ROOT_SELECTOR,
      );
      if (!whoIsHereRoot) {
        return false;
      }

      observer.observe(whoIsHereRoot, {
        childList: true,
        subtree: true,
      });
      return true;
    };

    if (!observeWhoIsHereRoot()) {
      discoveryIntervalId = window.setInterval(() => {
        if (!observeWhoIsHereRoot()) {
          return;
        }

        window.clearInterval(discoveryIntervalId ?? undefined);
        discoveryIntervalId = null;
        scheduleMutationRefresh();
      }, WHO_IS_HERE_DISCOVERY_INTERVAL_MS);
    }

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      if (discoveryIntervalId !== null) {
        window.clearInterval(discoveryIntervalId);
      }

      observer.disconnect();
    };
  }, [isShiftPressed, selectedGuildId]);

  useEffect(() => {
    refreshRows();
  }, [
    entriesByKey,
    isShiftPressed,
    othersById,
    ownersByCharacterKey,
    selectedGuildId,
  ]);

  useEffect(() => {
    const handleMouseOver = (event: MouseEvent) => {
      const row = getHoverRow(event.target);
      if (!row || isMovingInsideRow(row, event.relatedTarget)) return;

      hoveredRowRef.current = row;
      const other = getRowOther(row, useOthersStore.getState().othersById);
      if (!other) return;

      if (!useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed) {
        refreshWhoIsHereTooltip(row, other);
        return;
      }

      useCharacterTooltipCatchingGuildsStore.getState().setActiveOther(other);
      refreshWhoIsHereTooltip(row, other);
    };

    const handleMouseOut = (event: MouseEvent) => {
      const row = getHoverRow(event.target);
      if (!row || isMovingInsideRow(row, event.relatedTarget)) return;

      const other = getRowOther(row, useOthersStore.getState().othersById);
      const activeOther =
        useCharacterTooltipCatchingGuildsStore.getState().activeOther;

      if (hoveredRowRef.current === row) {
        hoveredRowRef.current = null;
      }

      if (other && activeOther?.d.id === other.d.id) {
        useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
      }
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  useEffect(() => {
    const hoveredRow = hoveredRowRef.current;
    if (!hoveredRow) return;

    const other = getRowOther(hoveredRow, othersById);
    if (!other) return;

    if (isShiftPressed) {
      useCharacterTooltipCatchingGuildsStore.getState().setActiveOther(other);
      refreshWhoIsHereTooltip(hoveredRow, other);
      return;
    }

    refreshWhoIsHereTooltip(hoveredRow, other);

    if (
      useCharacterTooltipCatchingGuildsStore.getState().activeOther?.d.id ===
      other.d.id
    ) {
      useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
    }
  }, [isShiftPressed, othersById]);

  useEffect(() => {
    if (!isShiftPressed || !activeTarget) return;

    const row = document.querySelector<HTMLElement>(
      `${WHO_IS_HERE_ROW_SELECTOR}[data-id="${getEscapedSelectorValue(
        activeTarget.characterId,
      )}"]`,
    );
    if (!row) return;

    const other = getRowOther(row, othersById);
    if (!other) return;
    if (
      hoveredRowRef.current &&
      hoveredRowRef.current !== row &&
      activeTarget.characterId === String(other.d.id)
    ) {
      return;
    }

    refreshWhoIsHereTooltip(row, other);
  }, [activeTarget, entriesByKey, isShiftPressed, othersById]);
}
