import {
  getBattlesControllerGetBattleQueryOptions,
  getBattlesControllerGetBattleRawDataQueryOptions,
  getBattlesControllerGetBattleTimelineQueryOptions,
} from "@lootlog/client/battlelog";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState, type MouseEvent } from "react";

/** The parts of a click that decide whether the page handles it. */
type BattleClick = Pick<
  MouseEvent,
  | "defaultPrevented"
  | "button"
  | "metaKey"
  | "ctrlKey"
  | "shiftKey"
  | "altKey"
  | "preventDefault"
>;

/**
 * Moves between battles without the page skeleton: the current battle stays on screen while
 * the next one loads, and the route then finds its data cached. Pointing at a battle starts
 * loading it early, so a click usually switches at once.
 */
export const useBattleSwitch = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pendingBattleId, setPendingBattleId] = useState<string | null>(null);
  // The battle picked last; a slower load of an earlier pick must not override it.
  const latestBattleIdRef = useRef<string | null>(null);

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

  const openBattle = async (event: BattleClick, battleId: string) => {
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
    latestBattleIdRef.current = battleId;
    setPendingBattleId(battleId);

    // A failed load still navigates, so the route shows its own error state.
    await loadBattle(battleId).catch(() => undefined);

    if (latestBattleIdRef.current !== battleId) return;

    try {
      await navigate({
        to: "/@me/battle-panel/battles/$battleId",
        params: { battleId },
      });
    } finally {
      if (latestBattleIdRef.current === battleId) {
        latestBattleIdRef.current = null;
        setPendingBattleId(null);
      }
    }
  };

  return { pendingBattleId, prefetchBattle, openBattle };
};
