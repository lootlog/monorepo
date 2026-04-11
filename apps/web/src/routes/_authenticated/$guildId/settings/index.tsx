import { createFileRoute } from "@tanstack/react-router";
import { GeneralSettings } from "@/features/guild/settings/general/general";
import { GeneralSettingsSkeleton } from "@/features/guild/settings/general/general-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/")({
  component: GeneralSettings,
  pendingComponent: GeneralSettingsSkeleton,
});
