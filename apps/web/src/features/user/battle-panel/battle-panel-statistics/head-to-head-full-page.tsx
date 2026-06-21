import { headToHeadColumns } from "./components/head-to-head-columns";
import { HeadToHeadPageVariant } from "./head-to-head-page-variant";

export function HeadToHeadFullPage() {
  return (
    <HeadToHeadPageVariant
      columns={headToHeadColumns}
      emptyDescriptionKey="battlePanel.statistics.directMatchups.emptyDescription"
      emptyTitleKey="battlePanel.statistics.directMatchups.emptyTitle"
      matchmaking={false}
      showPhFilter
      subtitleKey="battlePanel.statistics.directMatchups.fullDescription"
      titleKey="battlePanel.statistics.directMatchups.title"
    />
  );
}
