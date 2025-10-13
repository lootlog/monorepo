import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelBattlesList } from "@/features/battle-panel/battle-panel-battles-list/battle-panel-battles-list";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/battles"
)({
  component: BattlePanelBattlesList,
});
