import { createFileRoute } from "@tanstack/react-router";
import { AppearanceSettingsPageSkeleton } from "@/features/appearance-settings/appearance-settings-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/settings/appearance")(
  {
    pendingComponent: AppearanceSettingsPageSkeleton,
  },
);
