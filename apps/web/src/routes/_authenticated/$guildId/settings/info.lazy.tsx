import { createLazyFileRoute } from "@tanstack/react-router";
import { InfoSettings } from "@/features/guild-settings/info-settings/info-settings";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/settings/info",
)({
  component: InfoSettings,
});
