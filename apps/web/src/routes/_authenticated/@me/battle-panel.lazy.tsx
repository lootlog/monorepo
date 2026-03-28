import { createLazyFileRoute } from "@tanstack/react-router";
import { BattlePanelLayout } from "@/features/battle-panel/battle-panel-layout/battle-panel-layout";

export const Route = createLazyFileRoute("/_authenticated/@me/battle-panel")({
  component: BattlePanelLayout,
});
