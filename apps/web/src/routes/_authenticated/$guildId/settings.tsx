import { loadGuildSettings } from "@/lib/router/guild-settings-loader";
import { createFileRoute } from "@tanstack/react-router";
import { SettingsLayout } from "@/features/guild/settings/settings-layout";

export const Route = createFileRoute("/_authenticated/$guildId/settings")({
  staticData: {
    navigation: ({ t }) => ({ label: t("common.breadcrumbs.settings") }),
  },
  loader: loadGuildSettings,
  component: SettingsLayout,
});
