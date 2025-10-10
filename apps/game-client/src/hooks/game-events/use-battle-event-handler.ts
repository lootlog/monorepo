import { createSHA256Hash } from "@/helpers/create-sha-256-hash";
import { mapBattleEventsToPayload } from "@/helpers/mappers/battlelog.mappers";
import { useCreateBattle } from "@/hooks/api/use-create-battle";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import { battleStore } from "@/store/game-store/battle.store";
import { useGlobalStore } from "@/store/global.store";
import { GameEvent } from "@/types/margonem/game-events/game-event";
import { useEffect, useRef } from "react";

export const useBattleEventHandler = () => {
  const { accountId, characterId, world } = useGlobalStore((s) => s.gameState);
  const { isBattleCollectionEnabled } = useBattlePanelStore();
  const { mutate: createBattle } = useCreateBattle();

  const isBattleCollectionEnabledRef = useRef(isBattleCollectionEnabled);

  useEffect(() => {
    isBattleCollectionEnabledRef.current = isBattleCollectionEnabled;
  }, [isBattleCollectionEnabled]);

  const handleBattleEventsV2 = async (event: GameEvent) => {
    if (
      !accountId ||
      !characterId ||
      !isBattleCollectionEnabledRef.current ||
      !world
    )
      return;

    if (event.f) {
      if (event.f.init === "1") {
        battleStore.battleState = "in-battle";
        battleStore.events = [];
      }

      battleStore.events.push(event);

      if (event.f.endBattle === 1 && battleStore.battleState === "in-battle") {
        console.log("Battle ended. Events:", battleStore.events);

        const battleTurns = battleStore.events.reduce((acc: string[], curr) => {
          if (!curr.f || !curr.f.m) return acc;

          return [...acc, ...curr.f.m];
        }, []);

        const battleHash = await createSHA256Hash(JSON.stringify(battleTurns));

        if (battleStore.lastBattleHash !== battleHash) {
          const events = mapBattleEventsToPayload(battleStore.events);

          if (events) {
            const hasNegativeId = battleStore.events.some((event) => {
              if (!event.f?.w) return false;
              return Object.keys(event.f.w).some((key) => {
                return key.startsWith("-");
              });
            });

            const teams = new Set<number>();
            battleStore.events.forEach((event) => {
              if (!event.f?.w) return;
              Object.values(event.f.w).forEach((warrior) => {
                if (warrior.team !== undefined) {
                  teams.add(warrior.team);
                }
              });
            });

            if (hasNegativeId || teams.size <= 1) {
              console.log(
                "Battle skipped:",
                hasNegativeId ? "negative warrior ID detected" : "only one team"
              );
            } else {
              createBattle({
                accountId,
                characterId,
                world,
                events,
              });
            }
          }
        }

        battleStore.lastBattleHash = battleHash;

        battleStore.events = [];
        battleStore.battleState = "idle";
      }
    }
  };

  return {
    handleBattleEventsV2,
  };
};
