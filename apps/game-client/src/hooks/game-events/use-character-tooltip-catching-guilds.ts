import { useEffect } from "react";
import { characterTooltipCatchingGuildsCoordinator } from "@/lib/character-tooltip-catching-guilds-coordinator";
import { appendCatchingGuildsTooltipSection } from "@/lib/margonem-tooltips/catching-guilds";
import { refreshActiveOtherTooltip } from "@/lib/margonem-tooltips/patcher";
import { characterTooltipTransforms } from "@/lib/margonem-tooltips/registry";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import {
  EMPTY_SHIFT_VIEW_RECORD,
  useShiftCatchingGuildsGuildId,
} from "./use-shift-catching-guilds-guild-id";

function refreshActiveOtherTooltipIfCurrent(key: string): void {
  const state = useCharacterTooltipCatchingGuildsStore.getState();

  if (state.isShiftPressed && state.activeTarget?.key === key) {
    refreshActiveOtherTooltip();
  }
}

export function useCharacterTooltipCatchingGuilds(): void {
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );

  const guildId = useShiftCatchingGuildsGuildId();
  const active = guildId !== null;

  const activeOther = useCharacterTooltipCatchingGuildsStore((state) =>
    active ? state.activeOther : null,
  );

  const activeTarget = useCharacterTooltipCatchingGuildsStore((state) =>
    active ? state.activeTarget : null,
  );

  const activeEntry = useCharacterTooltipCatchingGuildsStore((state) =>
    activeTarget ? state.entriesByKey[activeTarget.key] : undefined,
  );

  const ownersByCharacterKey = useOnlineCharacterOwnersStore((state) =>
    active ? state.ownersByCharacterKey : EMPTY_SHIFT_VIEW_RECORD,
  );

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

    // Focused Lootlog editors stop key events from bubbling, so Shift pressed
    // while typing stays out of Shift mode. The release must still end Shift
    // mode: Shift+S opens the command console and focuses its editor while
    // Shift is held, so the release is observed in the capture phase.
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  useEffect(() => {
    if (!active || !activeOther) return;

    useCharacterTooltipCatchingGuildsStore
      .getState()
      .setActiveOther(activeOther);
  }, [active, activeOther, ownersByCharacterKey]);

  useEffect(() => {
    if (!activeOther || !activeTarget) return;

    characterTooltipCatchingGuildsCoordinator.prioritize(activeTarget);
    refreshActiveOtherTooltipIfCurrent(activeTarget.key);
  }, [activeOther, activeTarget, guildId]);

  useEffect(() => {
    if (!isShiftPressed || !activeTarget || !activeEntry) return;

    refreshActiveOtherTooltipIfCurrent(activeTarget.key);
  }, [activeEntry, activeTarget, isShiftPressed]);
}
