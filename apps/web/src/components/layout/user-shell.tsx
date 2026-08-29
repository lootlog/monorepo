import { AppTopBar } from "@/components/layout/app-top-bar";
import { ROUTES } from "@/config/routes";
import { UserHeaderActionsContext } from "@/contexts/user-header-actions-context";
import {
  getBattleRouteLabel,
  type BattleRouteLabelMatch,
} from "@/lib/battle/battle-route-label";
import { Button } from "@lootlog/ui/components/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@lootlog/ui/components/breadcrumb";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { useLocation, useMatches, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Fragment, useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ThemeInteractiveFrame } from "@/themes";
import { getUserNavigationInfo } from "./get-user-navigation-info";

type UserShellProps = {
  children: ReactNode;
};

export const UserShell: FC<UserShellProps> = ({ children }) => {
  const location = useLocation();
  const matches = useMatches();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [headerActionsElement, setHeaderActionsElement] =
    useState<HTMLElement | null>(null);
  const currentMatch = matches[matches.length - 1] as
    | BattleRouteLabelMatch
    | undefined;

  const navigationInfo = getUserNavigationInfo({
    battleLabel: getBattleRouteLabel(currentMatch, t),
    path: location.pathname,
    t,
  });
  const isFullHeightContent =
    location.pathname === ROUTES.user.battlePanel.h2h ||
    location.pathname === ROUTES.user.battlePanel.matchmakingH2h ||
    location.pathname.startsWith(
      `${ROUTES.user.battlePanel.statistics}/player-vs-player/`,
    ) ||
    location.pathname === "/@me/kills";

  return (
    <UserHeaderActionsContext.Provider value={headerActionsElement}>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-row bg-background">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <AppTopBar>
            <div className="flex w-full flex-row items-center justify-between gap-2">
              <div className="flex flex-row items-center gap-2">
                <SidebarTrigger className="size-8!" />
                {navigationInfo.showBack && (
                  <div
                    onMouseEnter={() => setHoveredButton("back")}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    <ThemeInteractiveFrame
                      isHovered={hoveredButton === "back"}
                      isActive={false}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate({ to: navigationInfo.backPath as string })
                        }
                        className="h-8 w-8 p-1 rounded-full hover:bg-muted/50 transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </ThemeInteractiveFrame>
                  </div>
                )}
              </div>

              <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
                <BreadcrumbList className="flex-nowrap justify-center overflow-hidden">
                  {navigationInfo.breadcrumbs.map((crumb, index) => {
                    const isLast =
                      index === navigationInfo.breadcrumbs.length - 1;
                    return (
                      <Fragment
                        key={`${crumb.label}-${crumb.path ?? "current"}`}
                      >
                        <BreadcrumbItem className="min-w-0 shrink-0 last:shrink">
                          {crumb.path ? (
                            <div
                              onMouseEnter={() =>
                                setHoveredButton(`crumb-${index}`)
                              }
                              onMouseLeave={() => setHoveredButton(null)}
                            >
                              <ThemeInteractiveFrame
                                isHovered={hoveredButton === `crumb-${index}`}
                                isActive={false}
                              >
                                <BreadcrumbLink
                                  render={
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        navigate({ to: crumb.path as string })
                                      }
                                    />
                                  }
                                  className="min-h-8 cursor-pointer whitespace-nowrap rounded px-1 text-xs text-muted-foreground/70 transition-colors duration-200 hover:text-foreground"
                                >
                                  {crumb.label}
                                </BreadcrumbLink>
                              </ThemeInteractiveFrame>
                            </div>
                          ) : (
                            <BreadcrumbPage className="truncate text-sm font-bold">
                              {crumb.label}
                            </BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                        {!isLast && (
                          <BreadcrumbSeparator className="text-muted-foreground/30" />
                        )}
                      </Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>

              <div
                ref={setHeaderActionsElement}
                className="flex min-w-8 shrink-0 items-center justify-end gap-1"
              />
            </div>
          </AppTopBar>
          {isFullHeightContent ? (
            <div className="flex-1 min-h-0 overflow-auto">{children}</div>
          ) : (
            <ScrollArea className="flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-col gap-4 [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:!w-full">
              <div className="h-full min-w-0 w-full max-w-full overflow-x-hidden">
                {children}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </UserHeaderActionsContext.Provider>
  );
};
