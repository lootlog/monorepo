import { createFileRoute } from "@tanstack/react-router";
import { GuildDocsListPage } from "@/features/guild/docs/guild-docs-list-page";
import { GuildDocsListSkeleton } from "@/features/guild/docs/guild-docs-list-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/docs/")({
  component: GuildDocsListPage,
  pendingComponent: GuildDocsListSkeleton,
});
