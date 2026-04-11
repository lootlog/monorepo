import { createFileRoute } from "@tanstack/react-router";
import { AccountSettings } from "@/features/user/settings/account/account";
import { AccountSettingsPageSkeleton } from "@/features/user/settings/account/account-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/settings/account")({
  component: AccountSettings,
  pendingComponent: AccountSettingsPageSkeleton,
});
