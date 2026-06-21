import { matchmakingH2HColumns } from "./components/matchmaking-h2h-columns";
import { HeadToHeadPageVariant } from "./head-to-head-page-variant";

export function MatchmakingH2HFullPage() {
  return (
    <HeadToHeadPageVariant
      columns={matchmakingH2HColumns}
      emptyDescriptionKey="battlePanel.statistics.matchmaking.emptyDescription"
      emptyTitleKey="battlePanel.statistics.matchmaking.emptyTitle"
      matchmaking
      showPhFilter={false}
      showRatingDelta
      subtitleKey="battlePanel.statistics.matchmaking.fullDescription"
      titleKey="battlePanel.statistics.matchmaking.fullTitle"
      trailingSkeletonColumns={3}
    />
  );
}
