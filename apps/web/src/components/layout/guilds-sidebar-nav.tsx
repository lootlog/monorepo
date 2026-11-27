import { useSidebar } from "@lootlog/ui/components/sidebar";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { Lock } from "lucide-react";
import type { FC } from "react";
import { SidebarNav } from "./sidebar-nav/sidebar-nav";
import type { MenuItem } from "./sidebar-nav/types";
import { GuildSidebarHeader } from "./guild-sidebar-header";
import { GuildPinnedEventsSection } from "./guild-pinned-events-section";
import { CollapsePresence } from "@/components/common/collapse-presence";
import { useActiveBingoCount } from "@/hooks/api/use-active-bingo-count";
import { useActiveEventCount } from "@/hooks/api/use-active-event-count";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useMatches } from "@tanstack/react-router";
import {
  resolveAppNavigation,
  type AppNavigationItemId,
} from "@/navigation/app-navigation";
import { APP_NAVIGATION_ICONS } from "@/navigation/app-navigation-icons";

function getNavigationIcon(id: AppNavigationItemId, highlighted: boolean) {
  const Icon = APP_NAVIGATION_ICONS[id];

  return <Icon className={cn("mr-1 size-4", highlighted && "text-primary")} />;
}

type GuildsSidebarNavProps = {
  routeFailure?: "forbidden" | "unavailable";
};

export const GuildsSidebarNav: FC<GuildsSidebarNavProps> = ({
  routeFailure,
}) => {
  const guildId = useGuildId();
  const { data: accessPolicy } = useGuildPermissions();
  const { setOpenMobile } = useSidebar();
  const { t } = useTranslation();
  const matches = useMatches();
  const navigation = resolveAppNavigation({ matches, accessPolicy });

  const eventsNavigationItem = navigation.sidebarItems.find(
    ({ id }) => id === "organization-events",
  );

  const bingoNavigationItem = navigation.sidebarItems.find(
    ({ id }) => id === "organization-bingo",
  );

  const activeEventsGuildId = eventsNavigationItem?.visible
    ? (guildId ?? "")
    : "";

  const activeBingoGuildId = bingoNavigationItem?.visible
    ? (guildId ?? "")
    : "";

  const activeEventCount = useActiveEventCount(activeEventsGuildId);
  const activeBingoCount = useActiveBingoCount(activeBingoGuildId);

  const activeCountByItemId: Partial<Record<AppNavigationItemId, number>> = {
    "organization-events": activeEventCount,
    "organization-bingo": activeBingoCount,
  };

  const menuItems: MenuItem[] = navigation.sidebarItems.map((item) => {
    const activeCount = activeCountByItemId[item.id] ?? 0;
    const hasActiveCount = activeCount > 0;

    return {
      active: item.active,
      available: true,
      enabled: item.visible,
      icon: getNavigationIcon(item.id, hasActiveCount),
      label: item.label,
      path: item.href,
      group: item.group,
      badge: hasActiveCount
        ? { content: activeCount, variant: "default" }
        : undefined,
    };
  });

  const handleItemClick = () => {
    setOpenMobile(false);
  };

  const sidebarHeader = (
    <GuildSidebarHeader
      guildId={guildId}
      isRouteFailed={routeFailure !== undefined}
    />
  );

  return (
    <SidebarNav
      items={menuItems}
      header={sidebarHeader}
      beforeItems={
        <>
          <CollapsePresence open={routeFailure === "forbidden"}>
            <p className="flex items-center gap-2.5 px-5 pt-5 text-sm font-medium text-muted-foreground">
              <Lock aria-hidden="true" className="size-4 shrink-0" />
              {t("layout.guildsSelector.noAccess")}
            </p>
          </CollapsePresence>
          <GuildPinnedEventsSection
            key={guildId}
            guildId={guildId ?? ""}
            enabled={Boolean(eventsNavigationItem?.visible)}
            onNavigate={handleItemClick}
          />
        </>
      }
      ariaLabel={t("layout.navigation.guildAriaLabel")}
    />
  );
};
