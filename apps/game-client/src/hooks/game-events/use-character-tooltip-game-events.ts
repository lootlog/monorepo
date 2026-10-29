import { useEffect } from "react";
import { runtimeEventPipeline } from "@/lib/margonem-runtime/runtime-event-pipeline";
import { restoreLegacyShiftSections } from "@/lib/margonem-tooltips/patcher";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";

export function useCharacterTooltipGameEvents(): void {
  useEffect(() => {
    return runtimeEventPipeline.subscribeProjected((envelope) => {
      const event = envelope.raw;

      if (event?.town) {
        useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
      }

      // Shift sections exist only while Shift is held; skip listing the ids otherwise.
      if (
        event?.other &&
        useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed
      ) {
        restoreLegacyShiftSections(Object.keys(event.other));
      }
    });
  }, []);
}
