import { createFileRoute } from "@tanstack/react-router";
import { ThemeBasePickerPage } from "@/features/user/settings/appearance/theme-base-picker-page";

export const Route = createFileRoute(
  "/_authenticated/@me/settings/appearance_/themes/new",
)({
  component: ThemeBasePickerPage,
});
