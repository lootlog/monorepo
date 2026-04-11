import { createFileRoute } from "@tanstack/react-router";
import { MapTemplatesSettings } from "@/features/guild/settings/map-templates/map-templates";
import { MapTemplatesSkeleton } from "@/features/guild/settings/map-templates/map-templates-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/map-templates",
)({
  component: MapTemplatesSettings,
  pendingComponent: MapTemplatesSkeleton,
});
