import { createFileRoute } from "@tanstack/react-router";
import { Stats } from "@/features/stats/stats";

export const Route = createFileRoute("/_authenticated/$guildId/stats/")({
  component: Stats,
});
