import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  battlePanelAbyssSearchSchema,
  loadBattlePanelAbyssSearch,
} from "@/features/user/battle-panel/battle-panel-search";

// Abyss opponents moved into each season's page; old links open the seasons.
export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/abyss_/h2h",
)({
  validateSearch: battlePanelAbyssSearchSchema,
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/@me/battle-panel/abyss",
      search: loadBattlePanelAbyssSearch(location.searchStr),
    });
  },
});
