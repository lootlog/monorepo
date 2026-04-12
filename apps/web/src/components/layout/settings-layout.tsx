import { useGuildId } from "@/hooks/context/use-guild-id";
import { Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { HorizontalMenu } from "@/components/layout/horizontal-menu";
import { ROUTE_SEGMENTS } from "@/config/routes";

export const SettingsLayout: React.FC = () => {
  const guildId = useGuildId();
  const { t } = useTranslation();

  const navElements = [
    {
      id: "general",
      label: t("settings.guildNavigation.general"),
      href: ROUTE_SEGMENTS.guild.settings,
    },
    {
      id: "roles",
      label: t("settings.guildNavigation.roles"),
      href: `${ROUTE_SEGMENTS.guild.settings}${ROUTE_SEGMENTS.guild.roles}`,
    },
    {
      id: "lootlog",
      label: t("settings.guildNavigation.npcs"),
      href: `${ROUTE_SEGMENTS.guild.settings}${ROUTE_SEGMENTS.guild.npcs}`,
    },
    {
      id: "map-templates",
      label: t("settings.guildNavigation.mapTemplates"),
      href: `${ROUTE_SEGMENTS.guild.settings}${ROUTE_SEGMENTS.guild.mapTemplates}`,
    },
    {
      id: "members",
      label: t("settings.guildNavigation.members"),
      href: `${ROUTE_SEGMENTS.guild.settings}${ROUTE_SEGMENTS.guild.members}`,
    },
    {
      id: "info",
      label: t("settings.guildNavigation.info"),
      href: `${ROUTE_SEGMENTS.guild.settings}${ROUTE_SEGMENTS.guild.info}`,
    },
  ];

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <HorizontalMenu
        items={navElements}
        basePath={`/${guildId}`}
        ariaLabel={t("settings.navigationLabel")}
        className="shrink-0"
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
