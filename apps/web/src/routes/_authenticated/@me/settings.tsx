import { createFileRoute } from "@tanstack/react-router";
import { UserSettingsLayout } from "@/components/layout/user-settings-layout";

export const Route = createFileRoute("/_authenticated/@me/settings")({
  component: UserSettingsLayout,
});
