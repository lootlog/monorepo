import { createFileRoute } from "@tanstack/react-router";
import { ThemeBuilder } from "@/features/user/settings/appearance/theme-builder";

const validateSearch = (
  search: Record<string, unknown>,
): { source?: string } => {
  if (typeof search.source === "string") {
    return { source: search.source };
  }
  return {};
};

export const Route = createFileRoute(
  "/_authenticated/@me/settings/appearance/themes/new",
)({
  component: ThemeBuilder,
  validateSearch,
});
