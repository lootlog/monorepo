import { createFileRoute } from "@tanstack/react-router";
import { MapTemplatesSettings } from "@/features/guild-settings/map-templates-settings/map-templates-settings";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/map-templates",
)({
  component: MapTemplatesSettings,
});
