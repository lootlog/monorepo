import { createFileRoute } from "@tanstack/react-router";
import { RolesSettings } from "@/features/guild-settings/roles-settings/roles-settings";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/roles/$roleId",
)({
  component: RolesSettings,
});
