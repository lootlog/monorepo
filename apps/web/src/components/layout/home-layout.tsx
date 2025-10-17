import { UserSidebar } from "@/components/layout/user-sidebar";
import { PageContainer } from "@/components/ui/page-container";

import { SidebarProvider } from "@lootlog/ui/components/sidebar";
import { FC } from "react";
import { Outlet } from "@tanstack/react-router";

export const HomeLayout: FC = () => {
  return (
    <div className="h-screen max-h-screen overflow-y-auto flex flex-row">
      <SidebarProvider>
        <UserSidebar />
        <PageContainer>
          <Outlet />
        </PageContainer>
      </SidebarProvider>
    </div>
  );
};
