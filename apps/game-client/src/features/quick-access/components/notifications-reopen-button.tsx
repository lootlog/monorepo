import { useVisibleNotifications } from "@/features/notifications/hooks/use-visible-notifications";
import { QuickAccessReopenButton } from "@/features/quick-access/components/quick-access-reopen-button";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Reopens the closed notifications window while it still holds entries. */
export const NotificationsReopenButton = () => {
  const { t } = useTranslation("quickAccess");
  // The mounted notifications window already expires entries.
  const { notifications } = useVisibleNotifications({ autoCleanup: false });

  return (
    <QuickAccessReopenButton
      windowId="notifications"
      label={t("reopen.notifications", { count: notifications.length })}
      icon=<Bell aria-hidden="true" className="ll:size-4" />
      count={notifications.length}
    />
  );
};
