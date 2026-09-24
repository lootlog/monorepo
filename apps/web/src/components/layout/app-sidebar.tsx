import { GuildsSelector } from "@/components/layout/guilds-selector";
import { UserMenu } from "@/components/layout/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@lootlog/ui/components/sidebar";
import type { ReactNode } from "react";

type AppSidebarProps = {
  navigation?: ReactNode;
  compact?: boolean;
};

export const AppSidebar = ({
  compact = false,
  navigation,
}: AppSidebarProps) => {
  // The shell is a fixed-height column, so the desktop sidebar fills its row
  // instead of the viewport and starts below the announcement bar.
  return (
    <Sidebar className="absolute h-auto border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="h-full bg-sidebar">
        <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-row gap-0 text-sm">
          <GuildsSelector />
          {!compact && (navigation ?? <div className="flex-1 bg-sidebar" />)}
        </div>
      </SidebarContent>
      {!compact && (
        <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-0">
          <UserMenu />
        </SidebarFooter>
      )}
    </Sidebar>
  );
};
