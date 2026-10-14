import { ListToolbarSkeleton } from "@/components/common/list-toolbar-skeleton";
import type { ReactNode } from "react";
import { NotificationsTabs } from "./components/notifications-tabs";

/** Route-level stand-in for a notification tab: the tabs, its toolbar and its list. */
export const NotificationsTabSkeleton = ({
  actions,
  children,
}: {
  actions: ReactNode;
  children: ReactNode;
}) => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-hidden">
    <NotificationsTabs />
    <div className="border-t border-sidebar-border">
      <ListToolbarSkeleton>
        <div className="flex items-center gap-2">{actions}</div>
      </ListToolbarSkeleton>
      {children}
    </div>
  </div>
);
