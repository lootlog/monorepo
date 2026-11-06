import { useMatches } from "@tanstack/react-router";
import { useContext } from "react";
import { AppTabBar } from "@/components/layout/app-tab-bar";
import { GuildSearchContext } from "@/contexts/guild-search-context";
import { useActiveEventCount } from "@/hooks/api/use-active-event-count";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  resolveAppNavigation,
  resolveTabBarSections,
} from "@/navigation/app-navigation";

type GuildTabBarProps = {
  accessoryRef: (element: HTMLElement | null) => void;
};

/** The Organization's phone navigation, with its search and event badge. */
export const GuildTabBar = ({ accessoryRef }: GuildTabBarProps) => {
  const guildId = useGuildId();
  const { data: accessPolicy } = useGuildPermissions();
  const { setIsOpen: setIsSearchOpen } = useContext(GuildSearchContext);
  const matches = useMatches();
  const { sidebarItems } = resolveAppNavigation({ matches, accessPolicy });

  const canViewEvents = sidebarItems.some(
    ({ id, visible }) => id === "organization-events" && visible,
  );

  const activeEventCount = useActiveEventCount(
    canViewEvents ? (guildId ?? "") : "",
  );

  return (
    <AppTabBar
      sections={resolveTabBarSections(sidebarItems)}
      badges={{ "organization-events": activeEventCount }}
      onSearch={() => setIsSearchOpen(true)}
      accessoryRef={accessoryRef}
    />
  );
};
