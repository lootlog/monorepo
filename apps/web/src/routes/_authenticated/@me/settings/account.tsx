import { createFileRoute } from "@tanstack/react-router";
import { AccountSettings } from "@/features/account-settings/account-settings";
import { AccountSettingsPageSkeleton } from "@/features/account-settings/account-settings-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/settings/account")({
  component: AccountSettings,
  pendingComponent: AccountSettingsPageSkeleton,
});
