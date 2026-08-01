import { useEffect } from "react";
import { characterTooltipCatchingGuildsCoordinator } from "@/lib/character-tooltip-catching-guilds-coordinator";
import { appendCatchingGuildsTooltipSection } from "@/lib/margonem-tooltips/catching-guilds";
import { refreshActiveOtherCanvasTooltip } from "@/lib/margonem-tooltips/patcher";
import { characterTooltipTransforms } from "@/lib/margonem-tooltips/registry";
import { isConcreteLootlogGuildId } from "@/lib/selected-lootlog-guild";
import { useSelectedLootlogGuildId } from "@/hooks/use-selected-lootlog-guild";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { addMeasuredEventListener } from "@/lib/performance-monitoring/measured-callback";

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
  const selectedGuildId = useSelectedLootlogGuildId();

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

    const removeListeners = [
      addMeasuredEventListener(
        window,
        "keydown",
        handleKeyDown as EventListener,
        "tooltip-catching-guilds.keydown",
      ),
      addMeasuredEventListener(
        window,
        "keyup",
        handleKeyUp as EventListener,
        "tooltip-catching-guilds.keyup",
      ),
      addMeasuredEventListener(
        window,
        "blur",
        handleWindowBlur,
        "tooltip-catching-guilds.blur",
      ),
    ];

    return () => {
      for (const removeListener of removeListeners) removeListener();
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
