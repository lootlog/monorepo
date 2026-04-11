import { createFileRoute } from "@tanstack/react-router";
import { InfoSettings } from "@/features/guild/settings/info/info";
import { InfoSettingsSkeleton } from "@/features/guild/settings/info/info-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/info")({
  component: InfoSettings,
  pendingComponent: InfoSettingsSkeleton,
});
