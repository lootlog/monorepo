import { createFileRoute } from "@tanstack/react-router";
import { GroupFightsPage } from "@/features/guild/group-fights/group-fights-page";

export const Route = createFileRoute("/_authenticated/$guildId/group-fights")({
  component: GroupFightsPage,
});
