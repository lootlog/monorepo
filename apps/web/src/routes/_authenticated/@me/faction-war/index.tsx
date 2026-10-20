import { createFileRoute } from "@tanstack/react-router";
import { FactionWarOverview } from "@/features/user/faction-war/faction-war-overview";

export const Route = createFileRoute("/_authenticated/@me/faction-war/")({
  component: FactionWarOverview,
});
