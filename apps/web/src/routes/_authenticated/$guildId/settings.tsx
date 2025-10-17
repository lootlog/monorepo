import { createFileRoute } from "@tanstack/react-router";
import { SettingsLayout } from "@/components/layout/settings-layout";

export const Route = createFileRoute("/_authenticated/$guildId/settings")({
  component: SettingsLayout,
});
