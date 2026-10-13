import { AppContentFrame } from "./app-content-frame";
import { AppNavigationTopBar } from "./app-navigation-top-bar";
import { HeaderSlotsContext } from "@/contexts/header-slots-context";
import { useHeaderSlotTargets } from "@/hooks/use-header-slot-targets";
import { useMatches } from "@tanstack/react-router";
import type { FC, ReactNode } from "react";
import { resolveAppNavigation } from "@/navigation/app-navigation";
import { APP_NAVIGATION_ICONS } from "@/navigation/app-navigation-icons";

type UserShellProps = {
  children: ReactNode;
};

export const UserShell: FC<UserShellProps> = ({ children }) => {
  const matches = useMatches();
  const { slots, contextRef, actionsRef } = useHeaderSlotTargets();
  const navigationInfo = resolveAppNavigation({ matches });
  const section = navigationInfo.sidebarItems.find((item) => item.active);

  return (
    <HeaderSlotsContext.Provider value={slots}>
      <AppContentFrame
        header={
          <AppNavigationTopBar
            breadcrumbs={navigationInfo.breadcrumbs}
            parentPath={navigationInfo.parentPath}
            sectionIcon={section && APP_NAVIGATION_ICONS[section.id]}
            contextRef={contextRef}
            actionsRef={actionsRef}
          />
        }
      >
        {children}
      </AppContentFrame>
    </HeaderSlotsContext.Provider>
  );
};
