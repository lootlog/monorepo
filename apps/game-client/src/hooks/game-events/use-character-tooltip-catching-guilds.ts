import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { appendCatchingGuildsTooltipSection } from "@/lib/margonem-tooltips/catching-guilds";
import { refreshActiveOtherCanvasTooltip } from "@/lib/margonem-tooltips/patcher";
import { characterTooltipTransforms } from "@/lib/margonem-tooltips/registry";
import { fetchSingleCatchingGuilds } from "@/lib/character-tooltip-catching-guilds-cache";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";

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
  const queryClient = useQueryClient();

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
    if (!isShiftPressed || !activeOther || !activeTarget) return;

    const state = useCharacterTooltipCatchingGuildsStore.getState();
    const entry = state.entriesByKey[activeTarget.key];
    if (entry?.status === "loading" || entry?.status === "success") {
      return;
    }

    const fetchPromise = fetchSingleCatchingGuilds(queryClient, activeTarget);
    refreshActiveOtherTooltipIfCurrent(activeTarget.key);

    void fetchPromise.finally(() => {
      refreshActiveOtherTooltipIfCurrent(activeTarget.key);
    });
  }, [activeOther, activeTarget, isShiftPressed, queryClient]);
}
