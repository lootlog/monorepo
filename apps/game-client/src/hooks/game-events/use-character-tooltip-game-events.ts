import { useEffect } from "react";
import { runtimeEventPipeline } from "@/lib/margonem-runtime/runtime-event-pipeline";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { patchOtherCharacterTooltips } from "@/lib/margonem-tooltips/patcher";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import type { OtherEntry } from "@lootlog/margonem/game-events";
import type { Other } from "@lootlog/margonem/others";

function createsOther(entry: OtherEntry): boolean {
  return "action" in entry && entry.action === "CREATE";
}

export function useCharacterTooltipGameEvents(): void {
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );

  useEffect(() => {
    if (!isShiftPressed) return;

    patchOtherCharacterTooltips(Object.values(runtimeOtherHandles.getAll()));
  }, [isShiftPressed]);

  useEffect(() => {
    return runtimeEventPipeline.subscribeProjected((envelope) => {
      const event = envelope.raw;
      if (!event) return;

      if (event.town) {
        useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
      }

      if (!useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed) {
        return;
      }

      if (!event.other) return;
      const changedOthers: Other[] = [];

      for (const [id, entry] of Object.entries(event.other)) {
        if (!createsOther(entry)) continue;

        const runtimeOther = runtimeOtherHandles.get(id);
        if (!runtimeOther) continue;

        changedOthers.push(runtimeOther);
      }

      if (changedOthers.length > 0) {
        patchOtherCharacterTooltips(changedOthers);
      }
    });
  }, []);
}
