import { createFileRoute } from "@tanstack/react-router";
import { AppearanceSettings } from "@/features/user/settings/appearance/appearance";
import { AppearanceSettingsPageSkeleton } from "@/features/user/settings/appearance/appearance-page-skeleton";

const validateAppearanceSearch = (
  search: Record<string, unknown>,
): { theme?: string } => {
  if (typeof search.theme === "string") {
    return { theme: search.theme };
  }

  return {};
};

export const Route = createFileRoute("/_authenticated/@me/settings/appearance")(
  {
    component: AppearanceSettings,
    pendingComponent: AppearanceSettingsPageSkeleton,
    validateSearch: validateAppearanceSearch,
  },
);
