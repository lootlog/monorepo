import { AuthenticationGuard } from "components/auth/authentication-guard";
import { AppSidebar } from "components/layout/app-sidebar";
import { PageContainer } from "components/ui/page-container";
import { SidebarProvider } from "components/ui/sidebar";
import { Toaster } from "components/ui/toaster";
import { GuildContextProvider } from "contexts/guild.context";
import { FC } from "react";
import { Outlet } from "react-router-dom";

export const GuildLayoutBase: FC = () => {
  return (
    <GuildContextProvider>
      <div className="h-screen max-h-screen overflow-y-auto flex flex-row">
        <SidebarProvider>
          <AppSidebar />
          <PageContainer>
            <Outlet />
          </PageContainer>
        </SidebarProvider>
      </div>
      <Toaster />
    </GuildContextProvider>
  );
};

export const GuildLayout: FC = () => {
  return <AuthenticationGuard component={GuildLayoutBase} />;
};
