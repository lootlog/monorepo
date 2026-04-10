import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelBattlesList } from "@/features/battle-panel/battle-panel-battles-list/battle-panel-battles-list";
import { BattlePanelBattlesSkeleton } from "@/features/battle-panel/battle-panel-battles-list/battle-panel-battles-skeleton";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/battles",
)({
  component: BattlePanelBattlesList,
  pendingComponent: BattlePanelBattlesSkeleton,
});
