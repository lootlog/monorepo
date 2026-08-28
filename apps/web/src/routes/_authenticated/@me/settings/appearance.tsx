import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppearanceSettingsPageSkeleton } from "@/features/user/settings/appearance/appearance-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/settings/appearance")(
  {
    component: Outlet,
    pendingComponent: AppearanceSettingsPageSkeleton,
  },
);
