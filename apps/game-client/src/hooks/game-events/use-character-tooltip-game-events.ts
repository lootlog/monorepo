import { useEffect } from "react";
import { runtimeEventPipeline } from "@/lib/margonem-runtime/runtime-event-pipeline";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";

export function useCharacterTooltipGameEvents(): void {
  useEffect(() => {
    return runtimeEventPipeline.subscribeProjected((envelope) => {
      if (envelope.raw?.town) {
        useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
      }
    });
  }, []);
}
