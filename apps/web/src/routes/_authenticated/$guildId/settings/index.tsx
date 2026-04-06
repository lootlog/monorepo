import { createFileRoute } from "@tanstack/react-router";
import { GeneralSettings } from "@/features/guild-settings/general-settings/general-settings";

export const Route = createFileRoute("/_authenticated/$guildId/settings/")({
  component: GeneralSettings,
});
