import { ListToolbarSkeleton } from "@/components/common/list-toolbar-skeleton";
import type { ReactNode } from "react";

export const NotificationsTabSkeleton = ({
  actions,
  children,
}: {
  actions: ReactNode;
  children: ReactNode;
}) => (
  <div aria-busy="true">
    <ListToolbarSkeleton>
      <div className="flex items-center gap-2">{actions}</div>
    </ListToolbarSkeleton>
    {children}
  </div>
);
