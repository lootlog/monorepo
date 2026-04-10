import { createFileRoute } from "@tanstack/react-router";
import { GuildPageSkeleton } from "@/features/guild/guild-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/")({
  pendingComponent: GuildPageSkeleton,
});
