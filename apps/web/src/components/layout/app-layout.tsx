import { lazy, Suspense, type CSSProperties } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { GuildShell } from "@/components/layout/guild-shell";
import { GuildSidebarNavPlaceholder } from "@/components/layout/guild-sidebar-nav-placeholder";
import { GuildsSidebarNav } from "@/components/layout/guilds-sidebar-nav";
import { StandaloneShell } from "@/components/layout/standalone-shell";
import { UserShell } from "@/components/layout/user-shell";
import { UserSidebarNav } from "@/components/layout/user-sidebar-nav";
import { Toaster } from "@lootlog/ui/components/sonner";
import { SidebarProvider } from "@lootlog/ui/components/sidebar";
import { Outlet, useLocation, useMatches } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { GlobalModals } from "@/components/common/global-modals";

const ThemeAnnouncement = lazy(() =>
  import("@/components/common/theme-announcement").then((module) => ({
    default: module.ThemeAnnouncement,
  })),
);
export const AppLayout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const guildRouteMatch = useMatches({
    select: (matches) =>
      matches.find((match) => match.routeId === "/_authenticated/$guildId"),
  });
  const isUserRoute =
    location.pathname === "/@me" || location.pathname.startsWith("/@me/");
  const isStandaloneRoute = location.pathname.startsWith(
    "/reservation-sharing/invitations/",
  );
  const hasResolvedGuildRoute =
    guildRouteMatch?.status === "success" &&
    guildRouteMatch.loaderData !== undefined;

  const showGuildNav =
    !isUserRoute && guildRouteMatch?.loaderData !== undefined;

  const sidebarNavigation = isStandaloneRoute ? null : isUserRoute ? (
    <UserSidebarNav />
  ) : showGuildNav ? (
    <GuildsSidebarNav />
  ) : (
    <GuildSidebarNavPlaceholder />
  );

  return (
    <div
      className="flex h-dvh w-full flex-col overflow-hidden bg-background text-foreground"
      data-design-system="signal-v2"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:outline-2 focus:outline-ring"
      >
        {t("layout.navigation.skipToContent")}
      </a>
      <Suspense fallback={null}>
        <ThemeAnnouncement />
      </Suspense>
      <SidebarProvider
        className="min-h-0 flex-1 overflow-hidden"
        style={
          isStandaloneRoute
            ? ({ "--sidebar-width": "4rem" } as CSSProperties)
            : undefined
        }
      >
        <AppSidebar
          compact={isStandaloneRoute}
          navigation={sidebarNavigation}
        />
        {isStandaloneRoute ? (
          <StandaloneShell>
            <Outlet />
          </StandaloneShell>
        ) : isUserRoute ? (
          <UserShell>
            <Outlet />
          </UserShell>
        ) : (
          <GuildShell variant={hasResolvedGuildRoute ? "ready" : "fallback"}>
            <Outlet />
          </GuildShell>
        )}
      </SidebarProvider>
      <Toaster />
      <GlobalModals />
    </div>
  );
};
