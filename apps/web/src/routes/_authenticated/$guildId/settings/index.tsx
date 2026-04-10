import { createFileRoute } from "@tanstack/react-router";
import { GeneralSettingsSkeleton } from "@/features/guild-settings/general-settings/general-settings-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/settings/")({
  pendingComponent: GeneralSettingsSkeleton,
});
