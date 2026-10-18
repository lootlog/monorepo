import { BattleAnalyticsOverview } from "@/features/user/battle-panel/battle-panel-statistics/components/battle-analytics-overview";
import { getAbyssSeasonAnalyticsParams } from "./abyss-season-params";
import { useAbyssSeason } from "./use-abyss-season";

/** The season's analytics: the battle panel's overview for its battles. */
export function AbyssSeasonAnalytics() {
  const { characterId, season } = useAbyssSeason();

  if (!characterId || !season) return null;

  return (
    <BattleAnalyticsOverview
      params={getAbyssSeasonAnalyticsParams({
        characterId,
        startDate: season.startedAt,
        endDate: season.endedAt,
      })}
      allOpponentsLink={{
        to: "/@me/battle-panel/abyss/$seasonId/opponents",
        params: { seasonId: season.id },
        search: { characterId },
      }}
    />
  );
}
