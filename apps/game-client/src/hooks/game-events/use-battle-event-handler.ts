import { createSHA256Hash } from "@/helpers/create-sha-256-hash";
import { mapBattleEventsToPayload } from "@/helpers/mappers/battlelog.mappers";
import { useCreateBattle } from "@/hooks/api/use-create-battle";
import { addAccountIdsToWarriors } from "@/hooks/game-events/helpers/battle.helpers";
import { Game } from "@/lib/game";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import { useBattleStore } from "@/store/game-store/battle.store";
import type { GameEvent } from "@/types/margonem/game-events/game-event";

export const useBattleEventHandler = () => {
  const { mutate: createBattle } = useCreateBattle();

  const handleBattleEvents = async (event: GameEvent) => {
    if (!event.f) return;

    const accountId = Game.hero.account;
    const characterId = Game.hero.id;
    const world = Game.getWorldName();

    const battlePanelStore = useBattlePanelStore.getState();
    const battleStore = useBattleStore.getState();

    if (event.f.init === "1") {
      battleStore.clearEvents();
      battleStore.setBattleState("in-battle");
      battleStore.updateBattleWarriors(null);
    }

    if (event.f.w) {
      const battleWarriorsWithAccountId = addAccountIdsToWarriors(
        event.f.w,
        useBattleStore.getState().battleWarriors,
      );
      battleStore.updateBattleWarriors(battleWarriorsWithAccountId);
    }

    if (!battlePanelStore.isBattleCollectionEnabled) return;

    battleStore.addEvent(event);

    if (
      event.f.endBattle === 1 &&
      useBattleStore.getState().battleState === "in-battle"
    ) {
      const battleTurns = useBattleStore
        .getState()
        .events.reduce((acc: string[], curr) => {
          if (!curr.f || !curr.f.m) return acc;

          return [...acc, ...curr.f.m];
        }, []);

      const battleHash = await createSHA256Hash(JSON.stringify(battleTurns));

      if (useBattleStore.getState().lastBattleHash !== battleHash) {
        const events = mapBattleEventsToPayload(
          useBattleStore.getState().events,
        );

        if (events) {
          const hasNegativeId = useBattleStore
            .getState()
            .events.some((event) => {
              if (!event.f?.w) return false;
              return Object.keys(event.f.w).some((key) => {
                return key.startsWith("-");
              });
            });

          const teams = new Set<number>();
          useBattleStore.getState().events.forEach((event) => {
            if (!event.f?.w) return;
            Object.values(event.f.w).forEach((warrior) => {
              if (warrior.team !== undefined) {
                teams.add(warrior.team);
              }
            });
          });

          if (!hasNegativeId && teams.size > 1) {
            createBattle({
              accountId: String(accountId),
              characterId: String(characterId),
              world,
              events,
            });
          }
        }
      }

      battleStore.setLastBattleHash(battleHash);

      battleStore.clearEvents();
      battleStore.setBattleState("idle");
    }
  };

  return {
    handleBattleEvents,
  };
};
