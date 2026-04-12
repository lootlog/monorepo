import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppearanceSettings } from "@/features/user/settings/appearance/appearance";
import { AppearanceSettingsPageSkeleton } from "@/features/user/settings/appearance/appearance-page-skeleton";

const searchSchema = z.object({
  theme: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/@me/settings/appearance")(
  {
    component: AppearanceSettings,
    pendingComponent: AppearanceSettingsPageSkeleton,
    validateSearch: searchSchema,
  },
);
