import { lazy, Suspense, type CSSProperties } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppLayoutFrame } from "@/components/layout/app-layout-frame";
import { GuildShell } from "@/components/layout/guild-shell";
import { GuildSidebarNavPlaceholder } from "@/components/layout/guild-sidebar-nav-placeholder";
import { GuildsSidebarNav } from "@/components/layout/guilds-sidebar-nav";
import { StandaloneShell } from "@/components/layout/standalone-shell";
import { UserShell } from "@/components/layout/user-shell";
import { UserSidebarNav } from "@/components/layout/user-sidebar-nav";
import { Toaster } from "@lootlog/ui/components/sonner";
import { SidebarProvider } from "@lootlog/ui/components/sidebar";
import { Outlet, useLocation, useMatches } from "@tanstack/react-router";
import { ThemePreviewSessionBanner } from "@/features/user/settings/appearance/theme-preview-session-banner";

const CreateGuildModal = lazy(() =>
  import("@/components/common/create-guild-modal/create-guild-modal").then(
    (module) => ({
      default: module.CreateGuildModal,
    }),
  ),
);
const InstallAddonModal = lazy(() =>
  import("@/components/common/install-addon-modal/install-addon-modal").then(
    (module) => ({
      default: module.InstallAddonModal,
    }),
  ),
);

export const AppLayout = () => {
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
      <div className="h-full min-h-0 flex-1">
        <AppLayoutFrame>
          <SidebarProvider
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
              <GuildShell
                variant={hasResolvedGuildRoute ? "ready" : "fallback"}
              >
                <Outlet />
              </GuildShell>
            )}
          </SidebarProvider>
        </AppLayoutFrame>
      </div>
      <Toaster />
      <ThemePreviewSessionBanner />
      <Suspense fallback={null}>
        <CreateGuildModal />
        <InstallAddonModal />
      </Suspense>
    </div>
  );
};
