import { createFileRoute } from "@tanstack/react-router";
import { ThemeImportPage } from "@/features/user/settings/appearance/theme-import-page";

export const Route = createFileRoute(
  "/_authenticated/@me/settings/appearance_/import/$shareToken",
)({
  component: ThemeImportPage,
});
