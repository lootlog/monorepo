import { useEffect } from "react";
import { margonemRuntimeBridge } from "@/lib/margonem-runtime/margonem-runtime-bridge";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { patchOtherCharacterTooltips } from "@/lib/margonem-tooltips/patcher";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useGlobalStore } from "@/store/global.store";
import type { OtherEntry } from "@lootlog/margonem/game-events";
import type { Other } from "@lootlog/margonem/others";

function isDeletedOther(entry: OtherEntry): boolean {
  return "del" in entry && entry.del === 1;
}

export function useCharacterTooltipGameEvents(): void {
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);

  useEffect(() => {
    if (!gameInitialized) return;

    patchOtherCharacterTooltips(Object.values(runtimeOtherHandles.getAll()));
  }, [gameInitialized]);

  useEffect(() => {
    return margonemRuntimeBridge.subscribeApplied((envelope) => {
      const event = envelope.raw;
      if (!event) return;
      const changedOthers: Other[] = [];

      if (event.town) {
        useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
      }

      if (!event.other) return;

      for (const [id, entry] of Object.entries(event.other)) {
        if (isDeletedOther(entry)) {
          continue;
        }

        const runtimeOther = runtimeOtherHandles.get(id);
        if (!runtimeOther) continue;

        changedOthers.push(runtimeOther);
      }

      patchOtherCharacterTooltips(changedOthers);
    });
  }, []);
}
