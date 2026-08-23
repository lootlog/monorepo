import { useEffect } from "react";
import { runtimeEventPipeline } from "@/lib/margonem-runtime/runtime-event-pipeline";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { patchOtherCharacterTooltips } from "@/lib/margonem-tooltips/patcher";
import { isConcreteLootlogGuildId } from "@/lib/selected-lootlog-guild";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useSelectedLootlogGuildId } from "@/hooks/use-selected-lootlog-guild";
import type { OtherEntry } from "@lootlog/margonem/game-events";
import type { Other } from "@lootlog/margonem/others";

function createsOther(entry: OtherEntry): boolean {
  return "action" in entry && entry.action === "CREATE";
}

export function useCharacterTooltipGameEvents(): void {
  const isShiftPressed = useCharacterTooltipCatchingGuildsStore(
    (state) => state.isShiftPressed,
  );
  const selectedGuildId = useSelectedLootlogGuildId();
  const active = isShiftPressed && isConcreteLootlogGuildId(selectedGuildId);

  useEffect(() => {
    if (!active) return;

    patchOtherCharacterTooltips(Object.values(runtimeOtherHandles.getAll()));
  }, [active]);

  useEffect(() => {
    return runtimeEventPipeline.subscribeProjected((envelope) => {
      const event = envelope.raw;
      if (!event) return;

      if (event.town) {
        useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
      }

      if (!active) return;

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
  }, [active]);
}
