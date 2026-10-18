import { BattleDetailView } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-view";
import { BattlePanelSingleBattleActions } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-panel-single-battle-actions";
import { getRecentOpponentBattleContext } from "@/features/user/battle-panel/battle-panel-single-battle/components/recent-opponent-battle-context";
import { RecentOpponentBattlesSection } from "@/features/user/battle-panel/battle-panel-single-battle/components/recent-opponent-battles-section";
import {
  useBattlesControllerGetBattle,
  useBattlesControllerGetBattleRawData,
  useBattlesControllerGetBattleTimeline,
} from "@lootlog/client/battlelog";
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
    <BattleDetailView
      actions={
        battle ? <BattlePanelSingleBattleActions battle={battle} /> : undefined
      }
      battle={battle}
      battleId={battleId}
      isTimelinePending={isTimelinePending}
      rawBattle={rawBattle?.rawData}
      sideContent={
        shouldShowRecentOpponentBattles ? (
          <RecentOpponentBattlesSection battle={battle} />
        ) : undefined
      }
      timeline={timeline}
    />
  );
};
