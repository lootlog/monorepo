import { createSHA256Hash } from "@/helpers/create-sha-256-hash";
import { mapBattleEventsToPayload } from "@/helpers/mappers/battlelog.mappers";
import { useCreateBattle } from "@/hooks/api/use-create-battle";
import { battleStore } from "@/store/game-store/battle.store";
import { useGlobalStore } from "@/store/global.store";
import { GameEvent } from "@/types/margonem/game-events/game-event";

export const useBattleEventHandler = () => {
  const { accountId, characterId } = useGlobalStore((s) => s.gameState);
  const { mutate: createBattle } = useCreateBattle();

  const handleBattleEventsV2 = async (event: GameEvent) => {
    if (!accountId || !characterId) return;

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
            createBattle({
              accountId,
              characterId,
              world: "gordion",
              events,
            });
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
