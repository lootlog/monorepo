import { headToHeadColumns } from "./components/head-to-head-columns";
import { HeadToHeadPageVariant } from "./head-to-head-page-variant";

/** Shared with the route's pending skeleton, which renders the same titles. */
export const headToHeadPageCopy = {
  subtitleKey: "battlePanel.statistics.directMatchups.fullDescription",
  titleKey: "battlePanel.statistics.directMatchups.title",
};

export function HeadToHeadFullPage() {
  return (
    <HeadToHeadPageVariant
      columns={headToHeadColumns}
      emptyDescriptionKey="battlePanel.statistics.directMatchups.emptyDescription"
      emptyTitleKey="battlePanel.statistics.directMatchups.emptyTitle"
      matchmaking={false}
      showPhFilter
      {...headToHeadPageCopy}
    />
  );
}
