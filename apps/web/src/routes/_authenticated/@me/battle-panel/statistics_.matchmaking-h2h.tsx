import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  battlePanelHeadToHeadSearchSchema,
  loadBattlePanelHeadToHeadSearch,
} from "@/features/user/battle-panel/battle-panel-search";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/matchmaking-h2h",
)({
  validateSearch: battlePanelHeadToHeadSearchSchema,
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/@me/battle-panel/abyss/h2h",
      search: loadBattlePanelHeadToHeadSearch(location.searchStr),
    });
  },
});
