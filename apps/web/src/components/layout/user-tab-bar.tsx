import { useMatches } from "@tanstack/react-router";
import { AppTabBar } from "@/components/layout/app-tab-bar";
import {
  resolveAppNavigation,
  resolveTabBarSections,
} from "@/navigation/app-navigation";

/** The personal space's phone navigation. */
export const UserTabBar = () => {
  const matches = useMatches();
  const { sidebarItems } = resolveAppNavigation({ matches });

  return <AppTabBar sections={resolveTabBarSections(sidebarItems)} />;
};
