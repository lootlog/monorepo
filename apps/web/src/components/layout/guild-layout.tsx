import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@lootlog/ui/components/sidebar";
import { Toaster } from "@lootlog/ui/components/sonner";
import { GuildContextProvider } from "@/contexts/guild.context";
import { GuildWatchedItemsProvider } from "@/features/user-notifications/contexts/guild-watched-items-context";
import type { FC, ReactNode } from "react";
import { Outlet } from "@tanstack/react-router";
import { GuildBreadcrumbs } from "@/components/layout/guild-breadcrumbs";
import { GuildsSidebarNav } from "@/components/layout/guilds-sidebar-nav";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslation } from "react-i18next";

type GuildLayoutProps = {
  children?: ReactNode;
  showGuildChrome?: boolean;
};

export const GuildLayout: FC<GuildLayoutProps> = ({
  children,
  showGuildChrome = true,
}) => {
  const { t } = useTranslation();

  return (
    <GuildContextProvider>
      <GuildWatchedItemsProvider>
        <div className="h-full max-h-full overflow-hidden flex flex-row">
          <SidebarProvider>
            <AppSidebar
              navigation={showGuildChrome ? <GuildsSidebarNav /> : undefined}
            />
            <div className="flex flex-row w-full h-full min-h-0">
              <div className="w-full h-full flex flex-col min-h-0">
                {showGuildChrome ? (
                  <GuildBreadcrumbs />
                ) : (
                  <PageHeader>
                    <div className="flex items-center gap-2">
                      <SidebarTrigger />
                      <span className="text-sm font-semibold">
                        {t("common.routeErrors.guildShellTitle")}
                      </span>
                    </div>
                  </PageHeader>
                )}
                <div className="flex-1 min-h-0 flex flex-col gap-4 w-full max-w-full h-full overflow-hidden">
                  {children ?? <Outlet />}
                </div>
              </div>
            </div>
          </SidebarProvider>
        </div>
        <Toaster />
      </GuildWatchedItemsProvider>
    </GuildContextProvider>
  );
};
