import { UserHeaderActionsPortal } from "@/components/layout/user-header-actions-portal";
import { BattleDetailView } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-view";
import { BattlePanelSingleBattleActions } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-panel-single-battle-actions";
import { getRecentOpponentBattleContext } from "@/features/user/battle-panel/battle-panel-single-battle/components/recent-opponent-battle-context";
import { RecentOpponentBattlesCard } from "@/features/user/battle-panel/battle-panel-single-battle/components/recent-opponent-battles-card";
import {
  useBattlesControllerGetBattle,
  useBattlesControllerGetBattleRawData,
  useBattlesControllerGetBattleTimeline,
} from "@/lib/api/generated/battlelog/battles/battles";
import { useParams } from "@tanstack/react-router";

export const BattlePanelSingleBattle = () => {
  const { battleId } = useParams({
    from: "/_authenticated/@me/battle-panel/battles_/$battleId",
  });
  const { data: battle } = useBattlesControllerGetBattle({ battleId });
  const { data: rawBattle } = useBattlesControllerGetBattleRawData({
    battleId,
  });
  const { data: timeline, isPending: isTimelinePending } =
    useBattlesControllerGetBattleTimeline({ battleId });
  const shouldShowRecentOpponentBattles =
    getRecentOpponentBattleContext(battle) !== null;

  return (
    <>
      {battle ? (
        <UserHeaderActionsPortal>
          <BattlePanelSingleBattleActions battle={battle} />
        </UserHeaderActionsPortal>
      ) : null}
      <BattleDetailView
        battle={battle}
        battleId={battleId}
        isTimelinePending={isTimelinePending}
        rawBattle={rawBattle?.rawData}
        sideContent={
          shouldShowRecentOpponentBattles ? (
            <RecentOpponentBattlesCard battle={battle} />
          ) : undefined
        }
        timeline={timeline}
      />
    </>
  );
};
