import { matchmakingH2HColumns } from "@/features/user/battle-panel/battle-panel-statistics/components/matchmaking-h2h-columns";
import { HeadToHeadPageVariant } from "@/features/user/battle-panel/battle-panel-statistics/head-to-head-page-variant";
import { useAbyssSeason } from "./use-abyss-season";

/** Everyone fought in the season, with the record and rating against each. */
export function AbyssSeasonOpponents() {
  const { characterId, season } = useAbyssSeason();

  if (!characterId || !season) return null;

  return (
    <HeadToHeadPageVariant
      columns={matchmakingH2HColumns}
      emptyDescriptionKey="battlePanel.statistics.matchmaking.emptyDescription"
      emptyTitleKey="battlePanel.statistics.matchmaking.emptyTitle"
      matchmaking
      showPhFilter={false}
      showRatingDelta
      titleKey="battlePanel.abyss.tabs.opponents"
      trailingSkeletonColumns={3}
      season={{
        characterId,
        startDate: season.startedAt,
        endDate: season.endedAt,
      }}
    />
  );
}
