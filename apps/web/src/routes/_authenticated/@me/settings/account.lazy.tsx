import { createLazyFileRoute } from "@tanstack/react-router";
import { AccountSettings } from "@/features/account-settings/account-settings";

export const Route = createLazyFileRoute(
  "/_authenticated/@me/settings/account",
)({
  component: AccountSettings,
});
