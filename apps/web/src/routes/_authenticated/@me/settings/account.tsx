import { createFileRoute } from "@tanstack/react-router";
import { AccountSettings } from "@/features/account-settings";

export const Route = createFileRoute("/_authenticated/@me/settings/account")({
  component: AccountSettings,
});
