import { createFileRoute } from "@tanstack/react-router";
import { AppearanceSettings } from "@/features/user/settings/appearance/appearance";
import { AppearanceSettingsPageSkeleton } from "@/features/user/settings/appearance/appearance-page-skeleton";

import { z } from "zod";

const appearanceSearch = z.object({
  theme: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/@me/settings/appearance")(
  {
    component: AppearanceSettings,
    pendingComponent: AppearanceSettingsPageSkeleton,
    validateSearch: appearanceSearch.parse,
  },
);
