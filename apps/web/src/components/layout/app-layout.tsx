import { lazy, Suspense, useRef } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { GuildShell } from "@/components/layout/guild-shell";
import { GuildSidebarNavPlaceholder } from "@/components/layout/guild-sidebar-nav-placeholder";
import { GuildsSidebarNav } from "@/components/layout/guilds-sidebar-nav";
import { UserShell } from "@/components/layout/user-shell";
import { UserSidebarNav } from "@/components/layout/user-sidebar-nav";
import { Toaster } from "@lootlog/ui/components/sonner";
import { SidebarProvider } from "@lootlog/ui/components/sidebar";
import { Outlet, useLocation, useMatches } from "@tanstack/react-router";

const ThemeAnnouncement = lazy(() =>
  import("@/components/common/theme-announcement").then((module) => ({
    default: module.ThemeAnnouncement,
  })),
);
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
  const hasResolvedGuildRoute =
    guildRouteMatch?.status === "success" &&
    guildRouteMatch.loaderData !== undefined;

  const hasEverResolvedGuild = useRef(false);
  if (hasResolvedGuildRoute) {
    hasEverResolvedGuild.current = true;
  }
  if (isUserRoute) {
    hasEverResolvedGuild.current = false;
  }

  const showGuildNav = hasResolvedGuildRoute || hasEverResolvedGuild.current;

  const sidebarNavigation = isUserRoute ? (
    <UserSidebarNav />
  ) : showGuildNav ? (
    <GuildsSidebarNav />
  ) : (
    <GuildSidebarNavPlaceholder />
  );

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <Suspense fallback={null}>
        <ThemeAnnouncement />
      </Suspense>
      <div className="h-full min-h-0 flex-1">
        <div className="flex h-full max-h-full flex-row overflow-hidden">
          <SidebarProvider>
            <AppSidebar navigation={sidebarNavigation} />
            {isUserRoute ? (
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
        </div>
      </div>
      <Toaster />
      <Suspense fallback={null}>
        <CreateGuildModal />
        <InstallAddonModal />
      </Suspense>
    </div>
  );
};
