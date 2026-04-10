import { createFileRoute } from "@tanstack/react-router";
import { AppearanceSettings } from "@/features/appearance-settings/appearance-settings";
import { AppearanceSettingsPageSkeleton } from "@/features/appearance-settings/appearance-settings-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/settings/appearance")(
  {
    component: AppearanceSettings,
    pendingComponent: AppearanceSettingsPageSkeleton,
  },
);
