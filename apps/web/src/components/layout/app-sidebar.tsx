import { GuildsSelector } from "@/components/layout/guilds-selector";
import { UserMenu } from "@/components/layout/user-menu";
import { UserMenuSheet } from "@/components/layout/user-menu-sheet";
import { AppNavigationSheet } from "@/components/layout/app-navigation-sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  useSidebar,
} from "@lootlog/ui/components/sidebar";
import type { ReactNode } from "react";
import { cn } from "cn";

export const COMPACT_SIDEBAR_WIDTH = "4rem";

type AppSidebarProps = {
  navigation?: ReactNode;
  compact?: boolean;
};

export const AppSidebar = ({
  compact = false,
  navigation,
}: AppSidebarProps) => {
  const { isMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <AppNavigationSheet footer={compact ? undefined : <UserMenuSheet />}>
        {compact || !navigation ? (
          <GuildsSelector
            orientation="horizontal"
            onSelect={() => setOpenMobile(false)}
          />
        ) : (
          navigation
        )}
      </AppNavigationSheet>
    );
  }

  return (
    <Sidebar
      className={cn(
        "absolute h-auto bg-sidebar",
        !compact && "border-r border-sidebar-border",
      )}
    >
      <SidebarContent className="h-full bg-sidebar">
        <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-row gap-0 text-sm">
          <GuildsSelector orientation="vertical" />
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
