import { createFileRoute } from "@tanstack/react-router";
import { Guild } from "@/features/guild/guild";
import { GuildPageSkeleton } from "@/features/guild/guild-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/")({
  component: Guild,
  pendingComponent: GuildPageSkeleton,
});
