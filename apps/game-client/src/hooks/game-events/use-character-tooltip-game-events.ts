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
      if (event.town) {
        useOthersStore.getState().clearOthers();
        useCharacterTooltipCatchingGuildsStore.getState().clearActiveOther();
      }

      if (!event.other) return;

      const runtimeOthers = getRuntimeOthers();
      const changedOthers: RuntimeOther[] = [];
      const othersStore = useOthersStore.getState();

      for (const [id, entry] of Object.entries(event.other)) {
        if (isDeletedOther(entry)) {
          othersStore.removeOther(id);
          continue;
        }

        const runtimeOther = runtimeOthers[id];
        if (!runtimeOther) continue;

        othersStore.upsertOther(id, runtimeOther);
        changedOthers.push(runtimeOther);
      }

      patchOtherCharacterTooltips(changedOthers);
    });
  }, []);
}
