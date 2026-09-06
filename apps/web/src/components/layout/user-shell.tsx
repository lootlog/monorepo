import { AppContentFrame } from "./app-content-frame";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { UserHeaderActionsContext } from "@/contexts/user-header-actions-context";
import { Button } from "@lootlog/ui/components/button";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { useMatches, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, type FC, type ReactNode } from "react";
import { ThemeInteractiveFrame } from "@/themes";
import { resolveAppNavigation } from "@/navigation/app-navigation";

type UserShellProps = {
  children: ReactNode;
};

export const UserShell: FC<UserShellProps> = ({ children }) => {
  const matches = useMatches();
  const navigate = useNavigate();
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [headerActionsElement, setHeaderActionsElement] =
    useState<HTMLElement | null>(null);
  const navigationInfo = resolveAppNavigation({ matches });
  const parentPath = navigationInfo.parentPath;

  return (
    <UserHeaderActionsContext.Provider value={headerActionsElement}>
      <AppContentFrame
        header={
          <AppTopBar>
            <div className="flex w-full flex-row items-center justify-between gap-2">
              <div className="flex flex-row items-center gap-2">
                <SidebarTrigger className="size-8!" />
                {parentPath && (
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
                        onClick={() => navigate({ to: parentPath })}
                        className="h-8 w-8 p-1 rounded-full hover:bg-muted/50 transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </ThemeInteractiveFrame>
                  </div>
                )}
              </div>

              <AppBreadcrumbs breadcrumbs={navigationInfo.breadcrumbs} />

              <div
                ref={setHeaderActionsElement}
                className="flex min-w-8 shrink-0 items-center justify-end gap-1"
              />
            </div>
          </AppTopBar>
        }
      >
        {children}
      </AppContentFrame>
    </UserHeaderActionsContext.Provider>
  );
};
