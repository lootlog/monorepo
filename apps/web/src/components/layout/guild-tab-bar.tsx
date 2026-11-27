import { useMatches } from "@tanstack/react-router";
import { useContext } from "react";
import { AppTabBar } from "@/components/layout/app-tab-bar";
import { GuildSearchContext } from "@/contexts/guild-search-context";
import { useActiveBingoCount } from "@/hooks/api/use-active-bingo-count";
import { useActiveEventCount } from "@/hooks/api/use-active-event-count";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  resolveAppNavigation,
  resolveTabBarSections,
} from "@/navigation/app-navigation";

export const GuildTabBar = () => {
  const guildId = useGuildId();
  const { data: accessPolicy } = useGuildPermissions();
  const { setIsOpen: setIsSearchOpen } = useContext(GuildSearchContext);
  const matches = useMatches();
  const { sidebarItems } = resolveAppNavigation({ matches, accessPolicy });

  const canViewEvents = sidebarItems.some(
    ({ id, visible }) => id === "organization-events" && visible,
  );

  const canViewBingo = sidebarItems.some(
    ({ id, visible }) => id === "organization-bingo" && visible,
  );

  const activeEventCount = useActiveEventCount(
    canViewEvents ? (guildId ?? "") : "",
  );

  const activeBingoCount = useActiveBingoCount(
    canViewBingo ? (guildId ?? "") : "",
  );

  return (
    <AppTabBar
      sections={resolveTabBarSections(sidebarItems)}
      badges={{
        "organization-events": activeEventCount,
        "organization-bingo": activeBingoCount,
      }}
      onSearch={() => setIsSearchOpen(true)}
    />
  );
};
