import { useEffect } from "react";
import { gameEventsManager } from "@/lib/game-events-manager";
import { patchOtherCharacterTooltips } from "@/lib/margonem-tooltips/patcher";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { useGlobalStore } from "@/store/global.store";
import { useOthersStore } from "@/store/others.store";
import type { Other as RuntimeOther } from "@lootlog/margonem/others";
import type { OtherEntry } from "@lootlog/margonem/game-events";

function getRuntimeOthers(): Record<string, RuntimeOther> {
  return window.Engine?.others?.check?.() ?? {};
}

function isDeletedOther(entry: OtherEntry): boolean {
  return "del" in entry && entry.del === 1;
}

export function useCharacterTooltipGameEvents(): void {
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);

  useEffect(() => {
    if (!gameInitialized) return;

    const runtimeOthers = getRuntimeOthers();
    useOthersStore.getState().setMany(runtimeOthers);
    patchOtherCharacterTooltips(Object.values(runtimeOthers));
  }, [gameInitialized]);

  useEffect(() => {
    return gameEventsManager.subscribeAfterGameEvent((event) => {
      const othersStore = useOthersStore.getState();
      const removeIds = event.town ? Object.keys(othersStore.othersById) : [];
      const upserts: Record<string, RuntimeOther> = {};
      const changedOthers: RuntimeOther[] = [];

      if (event.town) {
        useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
      }

      if (!event.other) {
        if (removeIds.length > 0) {
          othersStore.applyBatch({ removeIds });
        }
        return;
      }

      const runtimeOthers = getRuntimeOthers();

      for (const [id, entry] of Object.entries(event.other)) {
        if (isDeletedOther(entry)) {
          removeIds.push(id);
          continue;
        }

        const runtimeOther = runtimeOthers[id];
        if (!runtimeOther) continue;

        upserts[id] = runtimeOther;
        changedOthers.push(runtimeOther);
      }

      othersStore.applyBatch({ removeIds, upserts });
      patchOtherCharacterTooltips(changedOthers);
    });
  }, []);
}
