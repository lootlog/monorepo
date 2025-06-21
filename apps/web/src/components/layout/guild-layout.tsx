import { GuildSidebar } from "@/components/layout/guild-sidebar";
import { PageContainer } from "@/components/ui/page-container";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { GuildContextProvider } from "@/contexts/guild.context";
import { FC } from "react";
import { Outlet } from "react-router-dom";

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
