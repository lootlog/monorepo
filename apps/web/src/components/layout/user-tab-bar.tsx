import { useMatches } from "@tanstack/react-router";
import { AppTabBar } from "@/components/layout/app-tab-bar";
import {
  resolveAppNavigation,
  resolveTabBarSections,
} from "@/navigation/app-navigation";

type UserTabBarProps = {
  accessoryRef: (element: HTMLElement | null) => void;
};

/** The personal space's phone navigation. */
export const UserTabBar = ({ accessoryRef }: UserTabBarProps) => {
  const matches = useMatches();
  const { sidebarItems } = resolveAppNavigation({ matches });

  return (
    <AppTabBar
      sections={resolveTabBarSections(sidebarItems)}
      accessoryRef={accessoryRef}
    />
  );
};
