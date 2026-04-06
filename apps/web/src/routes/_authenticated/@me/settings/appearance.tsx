import { createFileRoute } from "@tanstack/react-router";
import { AppearanceSettings } from "@/features/appearance-settings";

export const Route = createFileRoute("/_authenticated/@me/settings/appearance")(
  {
    component: AppearanceSettings,
  },
);
