import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelSingleBattleSkeleton } from "@/features/battle-panel/battle-panel-single-battle/battle-panel-single-battle-skeleton";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/battles_/$battleId",
)({
  pendingComponent: BattlePanelSingleBattleSkeleton,
});
