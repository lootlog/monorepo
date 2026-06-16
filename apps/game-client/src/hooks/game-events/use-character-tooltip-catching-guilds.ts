import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  appendCatchingGuildsTooltipSection,
  characterTooltipTransforms,
  refreshActiveOtherCanvasTooltip,
} from "@/lib/margonem-tooltips";
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Shift") return;

      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
      refreshActiveOtherTooltip();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Shift") return;

      useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(false);
      refreshActiveOtherTooltip();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
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
