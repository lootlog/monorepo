import { createFileRoute } from "@tanstack/react-router";
import { ThemeBuilder } from "@/features/user/settings/appearance/theme-builder";

export const Route = createFileRoute(
  "/_authenticated/@me/settings/appearance/themes/$themeId",
)({
  component: ThemeBuilder,
});
