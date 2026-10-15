import { createFileRoute } from "@tanstack/react-router";
import { ThemeEditorPage } from "@/features/user/settings/appearance/theme-editor-page";

export const Route = createFileRoute(
  "/_authenticated/@me/settings/appearance_/themes/$themeId",
)({
  component: ThemeEditorPage,
});
