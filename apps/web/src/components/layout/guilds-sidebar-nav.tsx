import { useSidebar } from "@lootlog/ui/components/sidebar";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  BarChart4,
  BellRing,
  CalendarClock,
  ClipboardList,
  Clock,
  Logs,
  Settings,
  Trophy,
} from "lucide-react";
import type { FC } from "react";
import { SidebarNav, type MenuItem } from "./sidebar-nav/index";
import { ROUTE_SEGMENTS } from "@/config/routes";
import { Permission } from "@lootlog/types";
import { useTranslation } from "react-i18next";
import { useEvents } from "@/features/events/hooks";
import { GuildSidebarHeader } from "./guild-sidebar-header";
import { GuildPinnedEventsSection } from "./guild-pinned-events-section";

export const GuildsSidebarNav: FC = () => {
  const guildId = useGuildId();
  const { data: permissions } = useGuildPermissions();
  const { setOpenMobile } = useSidebar();
  const { t } = useTranslation();

  const canViewEvents =
    permissions?.includes(Permission.LOOTLOG_EVENTS_READ) ||
    permissions?.includes(Permission.LOOTLOG_EVENTS_MANAGE) ||
    permissions?.includes(Permission.OWNER);

  const { data: activeEvents } = useEvents({
    guildId: guildId ?? "",
    activeOnly: true,
    enabled: Boolean(canViewEvents),
  });
  const hasActiveEvents = (activeEvents?.length ?? 0) > 0;
  const activeEventCount = activeEvents?.length ?? 0;

  const menuItems: MenuItem[] = [
    {
      label: "Lootlog",
      icon: <ClipboardList className="mr-1 h-4 w-4" />,
      path: "",
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.LOOTLOG_LOOTS_READ) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
    {
      label: "Timery",
      icon: <Clock className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.timers,
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.LOOTLOG_TIMERS_READ) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
    {
      label: "Rezerwacje",
      icon: <CalendarClock className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.reservations,
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.LOOTLOG_RESERVATIONS_READ) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
    {
      label: "Eventy",
      icon: (
        <div className="relative mr-1">
          <Trophy
            className={`h-4 w-4 ${hasActiveEvents ? "text-yellow-500" : ""}`}
          />
          {hasActiveEvents && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
            </span>
          )}
        </div>
      ),
      path: ROUTE_SEGMENTS.guild.events,
      available: true,
      enabled: Boolean(canViewEvents),
      badge: hasActiveEvents
        ? { content: activeEventCount, variant: "default" as const }
        : undefined,
      highlight: hasActiveEvents,
    },
    {
      label: "Statystyki",
      icon: <BarChart4 className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.stats,
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.LOOTLOG_LOOTS_READ) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
    {
      divided: true,
      label: "Logi aktywności",
      icon: <Logs className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.activityLogs,
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.ADMIN) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
    {
      label: t("common.breadcrumbs.notifications"),
      icon: <BellRing className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.notifications,
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.ADMIN) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
    {
      label: "Ustawienia",
      icon: <Settings className="mr-1 h-4 w-4" />,
      path: ROUTE_SEGMENTS.guild.settings,
      available: true,
      enabled: Boolean(
        permissions?.includes(Permission.ADMIN) ||
        permissions?.includes(Permission.OWNER),
      ),
    },
  ];

  const handleItemClick = () => {
    setOpenMobile(false);
  };
  const sidebarHeader = <GuildSidebarHeader guildId={guildId} />;

  return (
    <SidebarNav
      items={menuItems}
      basePath={`/${guildId}`}
      header={sidebarHeader}
      beforeItems={
        canViewEvents ? (
          <GuildPinnedEventsSection
            guildId={guildId ?? ""}
            onNavigate={handleItemClick}
          />
        ) : undefined
      }
      onItemClick={handleItemClick}
    />
  );
};
