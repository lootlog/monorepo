import { headToHeadColumns } from "./components/head-to-head-columns";
import { HeadToHeadPageVariant } from "./head-to-head-page-variant";
import { headToHeadPageCopy } from "./head-to-head-page-copy";

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
