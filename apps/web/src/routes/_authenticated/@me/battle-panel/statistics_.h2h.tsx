import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  battlePanelHeadToHeadSearchSchema,
  loadBattlePanelHeadToHeadSearch,
} from "@/features/user/battle-panel/battle-panel-search";

// Opponents moved to their own battle panel tab; old links keep working.
export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/h2h",
)({
  validateSearch: battlePanelHeadToHeadSearchSchema,
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/@me/battle-panel/opponents",
      search: loadBattlePanelHeadToHeadSearch(location.searchStr),
    });
  },
});
