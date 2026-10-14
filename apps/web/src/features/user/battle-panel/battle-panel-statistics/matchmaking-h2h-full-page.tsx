import { matchmakingH2HColumns } from "./components/matchmaking-h2h-columns";
import { HeadToHeadPageVariant } from "./head-to-head-page-variant";

/** Shared with the route's pending skeleton, which renders the same titles. */
export const matchmakingH2HPageCopy = {
  titleKey: "battlePanel.statistics.matchmaking.fullTitle",
};

export function MatchmakingH2HFullPage() {
  return (
    <HeadToHeadPageVariant
      columns={matchmakingH2HColumns}
      emptyDescriptionKey="battlePanel.statistics.matchmaking.emptyDescription"
      emptyTitleKey="battlePanel.statistics.matchmaking.emptyTitle"
      matchmaking
      showPhFilter={false}
      showRatingDelta
      {...matchmakingH2HPageCopy}
      trailingSkeletonColumns={3}
    />
  );
}
