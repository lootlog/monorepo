import { createFileRoute } from "@tanstack/react-router";
import { ThemeEditorPage } from "@/features/user/settings/appearance/theme-editor-page";

export const Route = createFileRoute(
  "/_authenticated/@me/settings/appearance_/themes/$themeId",
)({
  staticData: {
    navigation: ({ t, parentPath }) => ({
      ancestors: [
        {
          label: t("settings.appearance.title"),
          path: `${parentPath}/appearance`,
        },
      ],
      label: t("settings.appearance.editor.breadcrumb"),
    }),
  },
  component: ThemeEditorPage,
});
