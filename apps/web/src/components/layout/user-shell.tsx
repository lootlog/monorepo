import { AppContentFrame } from "./app-content-frame";
import { AppNavigationTopBar } from "./app-navigation-top-bar";
import { HeaderSlotsContext } from "@/contexts/header-slots-context";
import { useHeaderSlotTargets } from "@/hooks/use-header-slot-targets";
import { useMatches } from "@tanstack/react-router";
import type { FC, ReactNode } from "react";
import { resolveAppNavigation } from "@/navigation/app-navigation";

type UserShellProps = {
  children: ReactNode;
};

export const UserShell: FC<UserShellProps> = ({ children }) => {
  const matches = useMatches();
  const { slots, titleRef, actionsRef, contextRef } = useHeaderSlotTargets();
  const navigationInfo = resolveAppNavigation({ matches });

  return (
    <HeaderSlotsContext.Provider value={slots}>
      <AppContentFrame
        header={
          <AppNavigationTopBar
            heading={navigationInfo.heading}
            titleRef={titleRef}
            actionsRef={actionsRef}
            contextRef={contextRef}
          />
        }
      >
        {children}
      </AppContentFrame>
    </HeaderSlotsContext.Provider>
  );
};
