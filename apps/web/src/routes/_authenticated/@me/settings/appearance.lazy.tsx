import { createLazyFileRoute } from "@tanstack/react-router";
import { AppearanceSettings } from "@/features/appearance-settings/appearance-settings";

export const Route = createLazyFileRoute(
  "/_authenticated/@me/settings/appearance",
)({
  component: AppearanceSettings,
});
