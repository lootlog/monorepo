import { GuildSidebar } from "@/components/layout/guild-sidebar";
import { PageContainer } from "@/components/ui/page-container";
import { SidebarProvider } from "@lootlog/ui/components/sidebar";
import { Toaster } from "@lootlog/ui/components/sonner";
import { GuildContextProvider } from "@/contexts/guild.context";
import { FC } from "react";
import { Outlet } from "@tanstack/react-router";

export const GuildLayout: FC = () => {
  return (
    <GuildContextProvider>
      <div className="h-screen max-h-screen overflow-y-auto flex flex-row">
        <SidebarProvider>
          <GuildSidebar />
          <PageContainer>
            <Outlet />
          </PageContainer>
        </SidebarProvider>
      </div>
      <Toaster />
    </GuildContextProvider>
  );
};
