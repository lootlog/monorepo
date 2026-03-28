import { createLazyFileRoute } from "@tanstack/react-router";
import { BattlePanelSingleBattle } from "@/features/battle-panel/battle-panel-single-battle/battle-panel-single-battle";

export const Route = createLazyFileRoute(
  "/_authenticated/@me/battle-panel/battles_/$battleId",
)({
  component: BattlePanelSingleBattle,
});
