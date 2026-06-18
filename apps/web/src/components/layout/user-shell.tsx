import { PageHeader } from "@/components/layout/page-header";
import { ROUTES } from "@/config/routes";
import { UserHeaderActionsContext } from "@/contexts/user-header-actions-context";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeInteractiveFrame } from "@/themes";

type UserShellProps = {
  children: ReactNode;
};

export const UserShell: FC<UserShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [headerActionsElement, setHeaderActionsElement] =
    useState<HTMLElement | null>(null);

  const getNavigationInfo = () => {
    const path = location.pathname;

    if (path === ROUTES.user.dashboard) {
      return {
        breadcrumbs: [{ label: t("layout.navigation.dashboard"), path: null }],
        showBack: false,
      };
    }

    if (path === ROUTES.user.battlePanel.base) {
      return {
        breadcrumbs: [
          { label: t("layout.navigation.battlePanel"), path: null },
        ],
        showBack: false,
      };
    }

    if (path === ROUTES.user.battlePanel.statistics) {
      return {
        breadcrumbs: [
          {
            label: t("layout.navigation.battlePanel"),
            path: ROUTES.user.battlePanel.base,
          },
          { label: t("layout.breadcrumbs.statistics"), path: null },
        ],
        showBack: true,
        backPath: ROUTES.user.battlePanel.base,
      };
    }

    if (path === ROUTES.user.battlePanel.h2h) {
      return {
        breadcrumbs: [
          {
            label: t("layout.navigation.battlePanel"),
            path: ROUTES.user.battlePanel.base,
          },
          {
            label: t("layout.breadcrumbs.statistics"),
            path: ROUTES.user.battlePanel.statistics,
          },
          { label: t("layout.breadcrumbs.headToHead"), path: null },
        ],
        showBack: true,
        backPath: ROUTES.user.battlePanel.statistics,
      };
    }

    if (path === ROUTES.user.battlePanel.matchmakingH2h) {
      return {
        breadcrumbs: [
          {
            label: t("layout.navigation.battlePanel"),
            path: ROUTES.user.battlePanel.base,
          },
          {
            label: t("layout.breadcrumbs.statistics"),
            path: ROUTES.user.battlePanel.statistics,
          },
          { label: t("layout.breadcrumbs.matchmakingHeadToHead"), path: null },
        ],
        showBack: true,
        backPath: ROUTES.user.battlePanel.statistics,
      };
    }

    if (
      path.startsWith(`${ROUTES.user.battlePanel.statistics}/player-vs-player/`)
    ) {
      return {
        breadcrumbs: [
          {
            label: t("layout.navigation.battlePanel"),
            path: ROUTES.user.battlePanel.base,
          },
          {
            label: t("layout.breadcrumbs.statistics"),
            path: ROUTES.user.battlePanel.statistics,
          },
          { label: t("layout.breadcrumbs.playerVsPlayer"), path: null },
        ],
        showBack: true,
        backPath: ROUTES.user.battlePanel.statistics,
      };
    }

    const normalizedPath = path.replace(/\/$/, "");
    const battlesDetailsPath = `${ROUTES.user.battlePanel.base}/battles`;

    if (normalizedPath.startsWith(`${battlesDetailsPath}/`)) {
      const battleId = normalizedPath.split("/").pop();
      if (battleId && battleId.length > 0) {
        return {
          breadcrumbs: [
            {
              label: t("layout.navigation.battlePanel"),
              path: ROUTES.user.battlePanel.base,
            },
            {
              label: t("layout.breadcrumbs.battles"),
              path: ROUTES.user.battlePanel.base,
            },
            {
              label: t("battlePanel.navigation.battleFallback", {
                id: battleId,
              }),
              path: null,
            },
          ],
          showBack: true,
          backPath: ROUTES.user.battlePanel.base,
        };
      }
    }

    if (path.startsWith(ROUTES.user.settings.base)) {
      return {
        breadcrumbs: [{ label: t("layout.navigation.settings"), path: null }],
        showBack: false,
      };
    }

    if (path.startsWith(ROUTES.user.notifications.base)) {
      return {
        breadcrumbs: [
          { label: t("layout.navigation.notifications"), path: null },
        ],
        showBack: false,
      };
    }

    if (path === "/@me/kills") {
      return {
        breadcrumbs: [
          {
            label: t("layout.navigation.dashboard"),
            path: ROUTES.user.dashboard,
          },
          { label: t("layout.breadcrumbs.npcRanking"), path: null },
        ],
        showBack: true,
        backPath: ROUTES.user.dashboard,
      };
    }

    return {
      breadcrumbs: [{ label: t("layout.navigation.dashboard"), path: null }],
      showBack: false,
    };
  };

  const navigationInfo = getNavigationInfo();
  const isFullHeightContent =
    location.pathname === ROUTES.user.battlePanel.h2h ||
    location.pathname === ROUTES.user.battlePanel.matchmakingH2h ||
    location.pathname.startsWith(
      `${ROUTES.user.battlePanel.statistics}/player-vs-player/`,
    ) ||
    location.pathname === "/@me/kills";

  return (
    <UserHeaderActionsContext.Provider value={headerActionsElement}>
      <div className="flex h-full min-h-0 w-full flex-row bg-background/70">
        <div className="flex h-full min-h-0 w-full flex-col">
          <PageHeader>
            <div className="flex w-full flex-row items-center justify-between gap-2">
              <div className="flex flex-row items-center gap-2">
                <SidebarTrigger />
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

              <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden text-sm">
                <AnimatePresence mode="popLayout">
                  {navigationInfo.breadcrumbs.map((crumb, index) => {
                    const isLast =
                      index === navigationInfo.breadcrumbs.length - 1;
                    return (
                      <motion.div
                        key={`${crumb.label}-${crumb.path ?? "current"}`}
                        className="flex min-w-0 shrink-0 items-center gap-1.5 last:shrink"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.15 }}
                      >
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
                              <button
                                type="button"
                                onClick={() =>
                                  navigate({
                                    to: crumb.path as string,
                                  })
                                }
                                className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors duration-200 whitespace-nowrap cursor-pointer"
                              >
                                {crumb.label}
                              </button>
                            </ThemeInteractiveFrame>
                          </div>
                        ) : (
                          <span className="truncate text-sm font-bold text-foreground">
                            {crumb.label}
                          </span>
                        )}
                        {!isLast && (
                          <span className="text-xs text-muted-foreground/30 select-none">
                            /
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              <div
                ref={setHeaderActionsElement}
                className="flex min-w-8 shrink-0 items-center justify-end gap-1"
              />
            </div>
          </PageHeader>
          {isFullHeightContent ? (
            <div className="flex-1 min-h-0 overflow-auto">{children}</div>
          ) : (
            <ScrollArea className="flex h-full min-h-0 w-full max-w-full flex-1 flex-col gap-4">
              <div className="h-full">{children}</div>
            </ScrollArea>
          )}
        </div>
      </div>
    </UserHeaderActionsContext.Provider>
  );
};
