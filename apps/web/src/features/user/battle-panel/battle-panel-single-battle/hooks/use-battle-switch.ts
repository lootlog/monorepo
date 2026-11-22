import {
  getBattlesControllerGetBattleQueryOptions,
  getBattlesControllerGetBattleRawDataQueryOptions,
  getBattlesControllerGetBattleTimelineQueryOptions,
} from "@lootlog/client/battlelog";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState, type MouseEvent } from "react";

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

export const useBattleSwitch = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pendingBattleId, setPendingBattleId] = useState<string | null>(null);
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

    await loadBattle(battleId).catch(() => undefined);

    if (latestBattleIdRef.current !== battleId) return;

    await navigate({
      to: "/@me/battle-panel/battles/$battleId",
      params: { battleId },
    }).finally(() => {
      if (latestBattleIdRef.current === battleId) {
        latestBattleIdRef.current = null;
        setPendingBattleId(null);
      }
    });
  };

  return { pendingBattleId, prefetchBattle, openBattle };
};
