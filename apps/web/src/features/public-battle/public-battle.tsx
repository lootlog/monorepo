import { RouteErrorState } from "@/components/router/route-error-state";
import { PublicBattleSkeleton } from "@/features/public-battle/public-battle-skeleton";
import { BattleDetailView } from "@/features/user/battle-panel/battle-panel-single-battle/components/battle-detail-view";
import {
  usePublicBattlesControllerGetPublicBattle,
  usePublicBattlesControllerGetPublicBattleRaw,
  usePublicBattlesControllerGetPublicBattleTimeline,
} from "@lootlog/client/battlelog";
import {
  getRouteErrorMessage,
  getRouteErrorStatus,
  normalizeRouteErrorStatus,
} from "@/lib/router/route-errors";
import { useParams } from "@tanstack/react-router";

export const PublicBattle = () => {
  const { id: battleId } = useParams({ from: "/battles/$id" });

  const {
    data: battle,
    isLoading: isBattleLoading,
    error: battleError,
  } = usePublicBattlesControllerGetPublicBattle({ battleId });
  const {
    data: rawBattle,
    isLoading: isRawBattleLoading,
    error: rawBattleError,
  } = usePublicBattlesControllerGetPublicBattleRaw({ battleId });
  const { data: timeline, isPending: isTimelinePending } =
    usePublicBattlesControllerGetPublicBattleTimeline({ battleId });

  if (isBattleLoading || isRawBattleLoading) {
    return <PublicBattleSkeleton />;
  }

  const error = battleError ?? rawBattleError;

  if (error || !battle || !rawBattle) {
    return (
      <div className="flex min-h-dvh bg-background">
        <RouteErrorState
          status={normalizeRouteErrorStatus(getRouteErrorStatus(error))}
          description={getRouteErrorMessage(error)}
        />
      </div>
    );
  }

  return (
    <div className="h-dvh min-h-0 overflow-hidden bg-background">
      <BattleDetailView
        battle={battle}
        battleId={battleId}
        isTimelinePending={isTimelinePending}
        rawBattle={rawBattle.rawData}
        timeline={timeline}
      />
    </div>
  );
};
