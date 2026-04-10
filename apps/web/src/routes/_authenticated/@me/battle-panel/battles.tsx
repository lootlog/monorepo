import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelBattlesSkeleton } from "@/features/battle-panel/battle-panel-battles-list/battle-panel-battles-skeleton";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/battles",
)({
  pendingComponent: BattlePanelBattlesSkeleton,
});
