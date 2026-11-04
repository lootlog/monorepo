import { createFileRoute } from "@tanstack/react-router";
import { ThemeImportPage } from "@/features/user/settings/appearance/theme-import-page";

export const Route = createFileRoute(
  "/_authenticated/@me/settings/appearance_/import/$shareToken",
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
  component: ThemeImportPage,
});
