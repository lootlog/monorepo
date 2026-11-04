import { createFileRoute } from "@tanstack/react-router";
import { InfoSettings } from "@/features/guild/settings/info/info";
import { InfoSettingsSkeleton } from "@/features/guild/settings/info/info-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/info")({
  staticData: {
    navigation: ({ t }) => ({ label: t("common.breadcrumbs.info"), tab: true }),
  },
  component: InfoSettings,
  pendingComponent: InfoSettingsSkeleton,
});
