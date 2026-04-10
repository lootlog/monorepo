import { createFileRoute } from "@tanstack/react-router";
import { AccountSettingsPageSkeleton } from "@/features/account-settings/account-settings-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/settings/account")({
  pendingComponent: AccountSettingsPageSkeleton,
});
