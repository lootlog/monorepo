import { PageHeader } from "@/components/layout/page-header";
import { FrozenButton } from "@/components/effects/rukia-frost";
import { ROUTES } from "@/config/routes";
import { useTheme } from "@/hooks/context/use-theme";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

type UserShellProps = {
  children: ReactNode;
};

export const UserShell: FC<UserShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isRukiaTheme = theme === "rukia";
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

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

    if (path === ROUTES.user.battlePanel.statistics) {
      return {
        breadcrumbs: [
          { label: "Panel walk", path: ROUTES.user.battlePanel.base },
          { label: "Statystyki", path: null },
        ],
        showBack: true,
        backPath: ROUTES.user.battlePanel.base,
      };
    }

    if (path === ROUTES.user.battlePanel.h2h) {
      return {
        breadcrumbs: [
          { label: "Panel walk", path: ROUTES.user.battlePanel.base },
          { label: "Statystyki", path: ROUTES.user.battlePanel.statistics },
          { label: "Bilans H2H", path: null },
        ],
        showBack: true,
        backPath: ROUTES.user.battlePanel.statistics,
      };
    }

    if (path === ROUTES.user.battlePanel.matchmakingH2h) {
      return {
        breadcrumbs: [
          { label: "Panel walk", path: ROUTES.user.battlePanel.base },
          { label: "Statystyki", path: ROUTES.user.battlePanel.statistics },
          { label: "Matchmaking H2H", path: null },
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
          { label: "Panel walk", path: ROUTES.user.battlePanel.base },
          { label: "Statystyki", path: ROUTES.user.battlePanel.statistics },
          { label: "Gracz vs Gracz", path: null },
        ],
        showBack: true,
        backPath: ROUTES.user.battlePanel.statistics,
      };
    }

    const normalizedPath = path.replace(/\/$/, "");
    const battlesPath = ROUTES.user.battlePanel.battles;

    if (normalizedPath === battlesPath) {
      return {
        breadcrumbs: [
          { label: "Panel walk", path: ROUTES.user.battlePanel.base },
          { label: "Walki", path: null },
        ],
        showBack: true,
        backPath: ROUTES.user.battlePanel.base,
      };
    }

    if (normalizedPath.startsWith(`${battlesPath}/`)) {
      const battleId = normalizedPath.split("/").pop();
      if (battleId && battleId.length > 0) {
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
    }

    if (path.startsWith(ROUTES.user.settings.base)) {
      return {
        breadcrumbs: [{ label: "Ustawienia", path: null }],
        showBack: false,
      };
    }

    if (path.startsWith(ROUTES.user.notifications.base)) {
      return {
        breadcrumbs: [
          { label: t("common.breadcrumbs.notifications"), path: null },
        ],
        showBack: false,
      };
    }

    if (path === "/@me/kills") {
      return {
        breadcrumbs: [
          { label: "Dashboard", path: ROUTES.user.dashboard },
          { label: "Ranking NPC", path: null },
        ],
        showBack: true,
        backPath: ROUTES.user.dashboard,
      };
    }

    return {
      breadcrumbs: [{ label: "Dashboard", path: null }],
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
    <div className="flex h-full min-h-0 w-full flex-row">
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
                  {isRukiaTheme ? (
                    <FrozenButton
                      isHovered={hoveredButton === "back"}
                      isActive={false}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate({ to: navigationInfo.backPath as string })
                        }
                        className="h-8 w-8 p-1"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </FrozenButton>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate({ to: navigationInfo.backPath as string })
                      }
                      className="h-8 w-8 p-1"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden text-sm">
              {navigationInfo.breadcrumbs.map((crumb, index) => (
                <div
                  key={index}
                  className="flex min-w-0 shrink-0 items-center gap-1 last:shrink"
                >
                  {crumb.path ? (
                    <div
                      onMouseEnter={() => setHoveredButton(`crumb-${index}`)}
                      onMouseLeave={() => setHoveredButton(null)}
                    >
                      {isRukiaTheme ? (
                        <FrozenButton
                          isHovered={hoveredButton === `crumb-${index}`}
                          isActive={false}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate({ to: crumb.path as string })
                            }
                            className="h-auto whitespace-nowrap p-1 text-sm font-semibold hover:bg-accent/50"
                          >
                            {crumb.label}
                          </Button>
                        </FrozenButton>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate({ to: crumb.path as string })}
                          className="h-auto whitespace-nowrap p-1 text-sm font-semibold hover:bg-accent/50"
                        >
                          {crumb.label}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="truncate px-1 font-semibold">
                      {crumb.label}
                    </span>
                  )}
                  {index < navigationInfo.breadcrumbs.length - 1 && (
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>

            <div className="w-8" />
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
  );
};
