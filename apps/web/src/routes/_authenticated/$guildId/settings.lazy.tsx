import { createLazyFileRoute } from "@tanstack/react-router";
import { SettingsLayout } from "@/components/layout/settings-layout";

export const Route = createLazyFileRoute("/_authenticated/$guildId/settings")({
  component: SettingsLayout,
});
