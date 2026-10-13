import { useSidebar } from "@lootlog/ui/components/sidebar";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { FC } from "react";
import { SidebarNav } from "./sidebar-nav/sidebar-nav";
import type { MenuItem } from "./sidebar-nav/types";
import { GuildSidebarHeader } from "./guild-sidebar-header";
import { GuildPinnedEventsSection } from "./guild-pinned-events-section";
import { getListEventsQueryKey, useListEvents } from "@lootlog/client/main";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useMatches } from "@tanstack/react-router";
import {
  resolveAppNavigation,
  type AppNavigationItemId,
} from "@/navigation/app-navigation";
import { APP_NAVIGATION_ICONS } from "@/navigation/app-navigation-icons";

function getNavigationIcon(id: AppNavigationItemId, hasActiveEvents: boolean) {
  const Icon = APP_NAVIGATION_ICONS[id];

  return (
    <Icon
      className={cn(
        "mr-1 size-4",
        id === "organization-events" && hasActiveEvents && "text-primary",
      )}
    />
  );
}

export const GuildsSidebarNav: FC = () => {
  const guildId = useGuildId();
  const { data: accessPolicy } = useGuildPermissions();
  const { setOpenMobile } = useSidebar();
  const { t } = useTranslation();
  const matches = useMatches();
  const navigation = resolveAppNavigation({ matches, accessPolicy });

  const eventsNavigationItem = navigation.sidebarItems.find(
    ({ id }) => id === "organization-events",
  );

  const activeEventsGuildId = eventsNavigationItem?.visible
    ? (guildId ?? "")
    : "";

  const { data: activeEvents } = useListEvents(
    {
      guildId: activeEventsGuildId,
    },
    {
      activeOnly: "true",
    },
    {
      query: {
        enabled: Boolean(activeEventsGuildId),
        queryKey: getListEventsQueryKey(
          {
            guildId: activeEventsGuildId,
          },
          {
            activeOnly: "true",
          },
        ),
      },
    },
  );

  const activeEventCount = activeEvents?.length ?? 0;
  const hasActiveEvents = activeEventCount > 0;

  const menuItems: MenuItem[] = navigation.sidebarItems.map((item) => ({
    active: item.active,
    available: true,
    enabled: item.visible,
    icon: getNavigationIcon(item.id, hasActiveEvents),
    label: item.label,
    path: item.href,
    divided: item.id === "organization-activity",
    badge:
      item.id === "organization-events" && hasActiveEvents
        ? { content: activeEventCount, variant: "default" }
        : undefined,
    highlight: item.id === "organization-events" && hasActiveEvents,
  }));

  const handleItemClick = () => {
    setOpenMobile(false);
  };

  const sidebarHeader = <GuildSidebarHeader guildId={guildId} />;

  return (
    <SidebarNav
      items={menuItems}
      header={sidebarHeader}
      beforeItems={
        eventsNavigationItem?.visible ? (
          <GuildPinnedEventsSection
            guildId={guildId ?? ""}
            onNavigate={handleItemClick}
          />
        ) : undefined
      }
      ariaLabel={t("layout.navigation.guildAriaLabel")}
    />
  );
};
