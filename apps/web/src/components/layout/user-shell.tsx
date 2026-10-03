import { AppContentFrame } from "./app-content-frame";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { UserHeaderActionsContext } from "@/contexts/user-header-actions-context";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { useMatches } from "@tanstack/react-router";
import { cn } from "cn";
import { useState, type FC, type ReactNode } from "react";
import { TopBarBackButton } from "./top-bar-back-button";
import { resolveAppNavigation } from "@/navigation/app-navigation";

type UserShellProps = {
  children: ReactNode;
};

export const UserShell: FC<UserShellProps> = ({ children }) => {
  const matches = useMatches();

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
                {parentPath && <TopBarBackButton to={parentPath} />}
              </div>

              <AppBreadcrumbs breadcrumbs={navigationInfo.breadcrumbs} />

              <div
                ref={setHeaderActionsElement}
                className={cn(
                  "flex shrink-0 items-center justify-end gap-1",
                  parentPath ? "min-w-[4.5rem]" : "min-w-8",
                )}
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
