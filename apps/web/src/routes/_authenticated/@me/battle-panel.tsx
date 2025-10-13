import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelLayout } from "@/features/battle-panel/battle-panel-layout/battle-panel-layout";

export const Route = createFileRoute("/_authenticated/@me/battle-panel")({
  component: BattlePanelLayout,
});
