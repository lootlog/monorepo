import { useSidebar } from "@lootlog/ui/components/sidebar";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  BarChart4,
  BellRing,
  CalendarClock,
  ClipboardList,
  Clock,
  FileText,
  Logs,
  Settings,
  Trophy,
} from "lucide-react";
import type { FC, ReactNode } from "react";
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

const organizationNavigationIcons: Partial<
  Record<AppNavigationItemId, ReactNode>
> = {
  "organization-loots": <ClipboardList className="mr-1 size-4" />,
  "organization-timers": <Clock className="mr-1 size-4" />,
  "organization-reservations": <CalendarClock className="mr-1 size-4" />,
  "organization-docs": <FileText className="mr-1 size-4" />,
  "organization-stats": <BarChart4 className="mr-1 size-4" />,
  "organization-activity": <Logs className="mr-1 size-4" />,
  "organization-notifications": <BellRing className="mr-1 size-4" />,
  "organization-settings": <Settings className="mr-1 size-4" />,
};

function getEventsIcon(hasActiveEvents: boolean) {
  return (
    <div className="relative mr-1">
      <Trophy
        className={cn("size-4", hasActiveEvents && "text-signal-timer")}
      />
      {hasActiveEvents && (
        <span className="absolute -top-1 -right-1 flex size-2">
          <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-timer opacity-75" />
          <span className="relative inline-flex rounded-full size-2 bg-signal-timer" />
        </span>
      )}
    </div>
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
    icon:
      item.id === "organization-events"
        ? getEventsIcon(hasActiveEvents)
        : organizationNavigationIcons[item.id],
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
