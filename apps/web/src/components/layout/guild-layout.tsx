import { GuildSidebar } from "@/components/layout/guild-sidebar";
import { SidebarProvider } from "@lootlog/ui/components/sidebar";
import { Toaster } from "@lootlog/ui/components/sonner";
import { GuildContextProvider } from "@/contexts/guild.context";
import type { FC } from "react";
import { Outlet } from "@tanstack/react-router";
import { GuildBreadcrumbs } from "@/components/layout/guild-breadcrumbs";

export const GuildLayout: FC = () => {
  return (
    <GuildContextProvider>
      <div className="h-full max-h-full overflow-hidden flex flex-row">
        <SidebarProvider>
          <GuildSidebar />
          <div className="flex flex-row w-full h-full min-h-0">
            <div className="w-full h-full flex flex-col min-h-0">
              <GuildBreadcrumbs />
              <div className="flex-1 min-h-0 flex flex-col gap-4 w-full max-w-full h-full overflow-hidden">
                <Outlet />
              </div>
            </div>
          </div>
        </SidebarProvider>
      </div>
      <Toaster />
    </GuildContextProvider>
  );
};
