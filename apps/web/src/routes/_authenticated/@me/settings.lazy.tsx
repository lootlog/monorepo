import { createLazyFileRoute } from "@tanstack/react-router";
import { UserSettingsLayout } from "@/components/layout/user-settings-layout";

export const Route = createLazyFileRoute("/_authenticated/@me/settings")({
  component: UserSettingsLayout,
});
