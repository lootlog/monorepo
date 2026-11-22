import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  battlePanelAbyssSearchSchema,
  loadBattlePanelAbyssSearch,
} from "@/features/user/battle-panel/battle-panel-search";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/matchmaking-h2h",
)({
  validateSearch: battlePanelAbyssSearchSchema,
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/@me/battle-panel/abyss",
      search: loadBattlePanelAbyssSearch(location.searchStr),
    });
  },
});
