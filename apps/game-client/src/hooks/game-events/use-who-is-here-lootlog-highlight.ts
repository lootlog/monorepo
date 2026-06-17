import type { Other } from "@lootlog/margonem/others";
import { useEffect, useRef, useState } from "react";
import { Game } from "@/lib/game";
import {
  LOOTLOG_OTHER_GLOW_BLUE,
  LOOTLOG_OTHER_GLOW_RED_ORANGE,
} from "@/lib/lootlog-other-glow-manager";
import { patchOtherCharacterTooltip } from "@/lib/margonem-tooltips/patcher";
import {
  getOtherCatchingGuildsTarget,
  useCharacterTooltipCatchingGuildsStore,
} from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { useSettingsStore } from "@/store/settings.store";

const HIGHLIGHT_CLASS = "ll-who-is-here-lootlog-highlight";
const STYLE_ELEMENT_ID = "ll-who-is-here-lootlog-style";
const WHO_IS_HERE_ROW_SELECTOR = ".whoishere-window .one-other[data-id]";
const WHO_IS_HERE_COLOR_PROPERTY = "--ll-who-is-here-lootlog-color";

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

function getCurrentCharacterId(): string | null {
  try {
    return String(Game.hero.id);
  } catch {
    return null;
  }
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
): Other | null {
  const characterId = getRowCharacterId(row);
  if (!characterId) return null;

  return (
    othersById[characterId] ??
    getRuntimeWindow().Engine?.others?.check?.()[characterId] ??
    null
  );
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
  const [mutationVersion, setMutationVersion] = useState(0);
  const entriesByKey = useCharacterTooltipCatchingGuildsStore(
    (state) => state.entriesByKey,
  );
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );
  const activeTarget = useCharacterTooltipCatchingGuildsStore(
    (state) => state.activeTarget,
  );
  const guildIdByCharId = useSettingsStore((state) => state.guildIdByCharId);
  const othersById = useOthersStore((state) => state.othersById);
  const ownersByCharacterKey = useOnlineCharacterOwnersStore(
    (state) => state.ownersByCharacterKey,
  );
  const currentCharacterId = getCurrentCharacterId();
  const selectedGuildId = currentCharacterId
    ? guildIdByCharId[currentCharacterId]
    : undefined;

  useEffect(() => {
    const cleanupStyle = installStyle();
    const observer = new MutationObserver(() => {
      setMutationVersion((version) => version + 1);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      cleanupStyle();

      for (const row of getWhoIsHereRows()) {
        clearRowHighlight(row);
      }
    };
  }, []);

  useEffect(() => {
    const rows = getWhoIsHereRows();

    if (!isShiftPressed || !selectedGuildId) {
      for (const row of rows) {
        clearRowHighlight(row);
      }
      return;
    }

    for (const row of rows) {
      const other = getRowOther(row, othersById);
      const target = other ? getOtherCatchingGuildsTarget(other) : null;
      const entry = target ? entriesByKey[target.key] : undefined;

      if (!target || entry?.status !== "success") {
        clearRowHighlight(row);
        continue;
      }

      const hasSelectedGuild = entry.guilds.some(
        (guild) => guild.id === selectedGuildId,
      );

      setRowHighlight(
        row,
        hasSelectedGuild
          ? LOOTLOG_OTHER_GLOW_BLUE
          : LOOTLOG_OTHER_GLOW_RED_ORANGE,
      );
    }
  }, [
    entriesByKey,
    isShiftPressed,
    mutationVersion,
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
