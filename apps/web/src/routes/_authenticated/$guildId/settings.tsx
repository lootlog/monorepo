import { loadGuildSettings } from "@/lib/router/guild-settings-loader";
import { createFileRoute } from "@tanstack/react-router";
import { SettingsLayout } from "@/components/layout/settings-layout";

export const Route = createFileRoute("/_authenticated/$guildId/settings")({
  loader: loadGuildSettings,
  component: SettingsLayout,
});
