import { createFileRoute } from "@tanstack/react-router";
import { MapTemplatesSkeleton } from "@/features/guild-settings/map-templates-settings/map-templates-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/map-templates",
)({
  pendingComponent: MapTemplatesSkeleton,
});
