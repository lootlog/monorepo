import { createFileRoute } from "@tanstack/react-router";
import { InfoSettings } from "@/features/guild-settings/info-settings/info-settings";
import { InfoSettingsSkeleton } from "@/features/guild-settings/info-settings/info-settings-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/info")({
  component: InfoSettings,
  pendingComponent: InfoSettingsSkeleton,
});
