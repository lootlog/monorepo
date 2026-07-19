import { useEffect } from "react";
import { characterTooltipCatchingGuildsCoordinator } from "@/lib/character-tooltip-catching-guilds-coordinator";
import { appendCatchingGuildsTooltipSection } from "@/lib/margonem-tooltips/catching-guilds";
import { refreshActiveOtherCanvasTooltip } from "@/lib/margonem-tooltips/patcher";
import { characterTooltipTransforms } from "@/lib/margonem-tooltips/registry";
import {
  getSelectedLootlogGuildId,
  isConcreteLootlogGuildId,
} from "@/lib/selected-lootlog-guild";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useSettingsStore } from "@/store/settings.store";

function refreshActiveOtherTooltip(): void {
  refreshActiveOtherCanvasTooltip();
}

function refreshActiveOtherTooltipIfCurrent(key: string): void {
  const state = useCharacterTooltipCatchingGuildsStore.getState();

  if (state.isShiftPressed && state.activeTarget?.key === key) {
    refreshActiveOtherTooltip();
  }
}

export function useCharacterTooltipCatchingGuilds(): void {
  const activeOther = useCharacterTooltipCatchingGuildsStore(
    (state) => state.activeOther,
  );
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );
  const activeTarget = useCharacterTooltipCatchingGuildsStore(
    (state) => state.activeTarget,
  );
  const activeEntry = useCharacterTooltipCatchingGuildsStore((state) =>
    activeTarget ? state.entriesByKey[activeTarget.key] : undefined,
  );
  const ownersByCharacterKey = useOnlineCharacterOwnersStore(
    (state) => state.ownersByCharacterKey,
  );
  const guildIdByCharId = useSettingsStore((state) => state.guildIdByCharId);
  const selectedGuildId = getSelectedLootlogGuildId(guildIdByCharId);

  useEffect(() => {
    return characterTooltipTransforms.register(
      appendCatchingGuildsTooltipSection,
    );
  }, []);

  useEffect(() => {
    const updateShiftPressed = (isShiftPressed: boolean) => {
      useCharacterTooltipCatchingGuildsStore
        .getState()
        .setShiftPressed(isShiftPressed);
      refreshActiveOtherTooltip();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Shift") return;
      if (event.repeat) return;

      updateShiftPressed(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Shift") return;

      updateShiftPressed(false);
    };
    const handleWindowBlur = () => {
      updateShiftPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    if (!activeOther) return;

    useCharacterTooltipCatchingGuildsStore
      .getState()
      .setActiveOther(activeOther);
  }, [activeOther, ownersByCharacterKey]);

  useEffect(() => {
    if (
      !isShiftPressed ||
      !activeOther ||
      !activeTarget ||
      !isConcreteLootlogGuildId(selectedGuildId)
    ) {
      return;
    }

    characterTooltipCatchingGuildsCoordinator.prioritize(activeTarget);
    refreshActiveOtherTooltipIfCurrent(activeTarget.key);
  }, [activeOther, activeTarget, isShiftPressed, selectedGuildId]);

  useEffect(() => {
    if (!isShiftPressed || !activeTarget || !activeEntry) return;

    refreshActiveOtherTooltipIfCurrent(activeTarget.key);
  }, [activeEntry, activeTarget, isShiftPressed]);
}
