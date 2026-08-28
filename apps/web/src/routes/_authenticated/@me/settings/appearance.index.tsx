import { createFileRoute } from "@tanstack/react-router";
import { AppearanceSettings } from "@/features/user/settings/appearance/appearance";

export const Route = createFileRoute(
  "/_authenticated/@me/settings/appearance/",
)({
  component: AppearanceSettings,
});
