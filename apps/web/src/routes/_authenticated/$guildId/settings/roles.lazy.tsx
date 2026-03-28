import { createLazyFileRoute } from "@tanstack/react-router";
import { RolesSettings } from "@/features/guild-settings/roles-settings/roles-settings";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/settings/roles",
)({
  component: RolesSettings,
});
