import { ServerVisibilitySettings } from "@/features/user/settings/servers/server-visibility-settings";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/@me/settings/servers")({
  component: ServerVisibilitySettings,
});
