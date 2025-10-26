import { UserSidebar } from "@/components/layout/user-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@lootlog/ui/components/sidebar";
import { FC } from "react";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Button } from "@lootlog/ui/components/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { ROUTES } from "@/config/routes";

export const HomeLayout: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getNavigationInfo = () => {
    const path = location.pathname;

    if (path === ROUTES.user.dashboard) {
      return {
        breadcrumbs: [{ label: "Dashboard", path: null }],
        showBack: false,
      };
    }

    if (
      path === ROUTES.user.battlePanel.base ||
      path === ROUTES.user.battlePanel.stats
    ) {
      return {
        breadcrumbs: [{ label: "Panel walk", path: null }],
        showBack: false,
      };
    }

    if (path === ROUTES.user.battlePanel.battles) {
      return {
        breadcrumbs: [
          { label: "Panel walk", path: ROUTES.user.battlePanel.base },
          { label: "Walki", path: null },
        ],
        showBack: true,
        backPath: ROUTES.user.battlePanel.base,
      };
    }

    if (path.startsWith(`${ROUTES.user.battlePanel.battles}/`)) {
      const battleId = path.split("/").pop();
      return {
        breadcrumbs: [
          { label: "Panel walk", path: ROUTES.user.battlePanel.base },
          { label: "Walki", path: ROUTES.user.battlePanel.battles },
          { label: `Walka #${battleId}`, path: null },
        ],
        showBack: true,
        backPath: ROUTES.user.battlePanel.battles,
      };
    }

    if (path.startsWith(ROUTES.user.settings.base)) {
      return {
        breadcrumbs: [{ label: "Ustawienia", path: null }],
        showBack: false,
      };
    }

    return {
      breadcrumbs: [{ label: "Dashboard", path: null }],
      showBack: false,
    };
  };

  const navInfo = getNavigationInfo();

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-row">
      <SidebarProvider>
        <UserSidebar />
        <div className="flex flex-row w-full h-full min-h-0">
          <div className="w-full h-full flex flex-col min-h-0">
            <PageHeader>
              <div className="flex flex-row gap-2 items-center justify-between w-full">
                <div className="flex flex-row gap-2 items-center">
                  <SidebarTrigger />
                  {navInfo.showBack && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate({ to: navInfo.backPath! as string })
                      }
                      className="p-1 h-8 w-8"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1 text-sm flex-1 min-w-0 justify-center overflow-hidden">
                  {navInfo.breadcrumbs.map((crumb, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 min-w-0 shrink-0 last:shrink"
                    >
                      {crumb.path ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate({ to: crumb.path! as string })
                          }
                          className="text-sm h-auto p-1 font-semibold hover:bg-accent/50 whitespace-nowrap"
                        >
                          {crumb.label}
                        </Button>
                      ) : (
                        <span className="font-semibold px-1 truncate">
                          {crumb.label}
                        </span>
                      )}
                      {index < navInfo.breadcrumbs.length - 1 && (
                        <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="w-8" />
              </div>
            </PageHeader>
            <ScrollArea className="flex-1 min-h-0 flex flex-col gap-4 w-full max-w-full h-full">
              <div className="h-full">
                <Outlet />
              </div>
            </ScrollArea>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};
