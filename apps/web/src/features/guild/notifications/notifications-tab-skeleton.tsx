import { ListToolbarSkeleton } from "@/components/common/list-toolbar-skeleton";
import type { ReactNode } from "react";
import { NotificationsTabs } from "./components/notifications-tabs";

/**
 * Route-level stand-in for a notification tab: the tabs, its toolbar and its
 * list. It clips rather than hides its overflow, so the tabs pin to the
 * document on phones as they do on the loaded page.
 */
export const NotificationsTabSkeleton = ({
  actions,
  children,
}: {
  actions: ReactNode;
  children: ReactNode;
}) => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-clip">
    <NotificationsTabs />
    <div>
      <ListToolbarSkeleton>
        <div className="flex items-center gap-2">{actions}</div>
      </ListToolbarSkeleton>
      {children}
    </div>
  </div>
);
