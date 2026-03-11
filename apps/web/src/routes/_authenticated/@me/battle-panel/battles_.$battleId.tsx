import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelSingleBattle } from "@/features/battle-panel/battle-panel-single-battle/battle-panel-single-battle";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/battles_/$battleId",
)({
  component: BattlePanelSingleBattle,
});
