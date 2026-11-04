import { createFileRoute } from "@tanstack/react-router";
import { NpcSettings } from "@/features/guild/settings/npcs/npcs";
import { NpcsSettingsSkeleton } from "@/features/guild/settings/npcs/npcs-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/npcs")({
  staticData: {
    navigation: ({ t }) => ({
      label: t("common.breadcrumbs.settingsNpcs"),
      tab: true,
    }),
  },
  component: NpcSettings,
  pendingComponent: NpcsSettingsSkeleton,
});
