import { createFileRoute } from "@tanstack/react-router";
import { UserSettings } from "@/features/user-settings/user-settings";

export const Route = createFileRoute("/_authenticated/@me/settings/")({
  component: UserSettings,
});
