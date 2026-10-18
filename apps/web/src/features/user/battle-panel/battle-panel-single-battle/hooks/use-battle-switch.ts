import {
  getBattlesControllerGetBattleQueryOptions,
  getBattlesControllerGetBattleRawDataQueryOptions,
  getBattlesControllerGetBattleTimelineQueryOptions,
} from "@lootlog/client/battlelog";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, type MouseEvent } from "react";

/**
 * Moves between battles without the page skeleton: the current battle stays on screen while
 * the next one loads, and the route then finds its data cached. Pointing at a battle starts
 * loading it early, so a click usually switches at once.
 */
export const useBattleSwitch = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pendingBattleId, setPendingBattleId] = useState<string | null>(null);

  const loadBattle = (battleId: string) =>
    Promise.all([
      queryClient.ensureQueryData(
        getBattlesControllerGetBattleQueryOptions({ battleId }),
      ),
      queryClient.ensureQueryData(
        getBattlesControllerGetBattleRawDataQueryOptions({ battleId }),
      ),
      queryClient.ensureQueryData(
        getBattlesControllerGetBattleTimelineQueryOptions({ battleId }),
      ),
    ]);

  const prefetchBattle = (battleId: string) => {
    void loadBattle(battleId).catch(() => undefined);
  };

  const openBattle = async (event: MouseEvent, battleId: string) => {
    // Opening in a new tab or window keeps the browser's own behaviour.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    setPendingBattleId(battleId);

    try {
      // A failed load still navigates, so the route shows its own error state.
      await loadBattle(battleId).catch(() => undefined);
      await navigate({
        to: "/@me/battle-panel/battles/$battleId",
        params: { battleId },
      });
    } finally {
      setPendingBattleId(null);
    }
  };

  return { pendingBattleId, prefetchBattle, openBattle };
};
