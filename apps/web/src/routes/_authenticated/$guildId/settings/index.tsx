import { createFileRoute } from "@tanstack/react-router";
import { GeneralSettings } from "@/features/guild-settings/general-settings/general-settings";
import { GeneralSettingsSkeleton } from "@/features/guild-settings/general-settings/general-settings-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/")({
  component: GeneralSettings,
  pendingComponent: GeneralSettingsSkeleton,
});
