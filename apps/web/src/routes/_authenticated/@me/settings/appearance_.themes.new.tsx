import { createFileRoute } from "@tanstack/react-router";
import { ThemeBasePickerPage } from "@/features/user/settings/appearance/theme-base-picker-page";

export const Route = createFileRoute(
  "/_authenticated/@me/settings/appearance_/themes/new",
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
  component: ThemeBasePickerPage,
});
