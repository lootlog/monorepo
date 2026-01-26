import { useGuildId } from "@/hooks/context/use-guild-id";
import { Outlet } from "@tanstack/react-router";
import { HorizontalMenu } from "@/components/layout/horizontal-menu";
import { ROUTE_SEGMENTS } from "@/config/routes";

const NAV_ELEMENTS = [
  {
    id: "general",
    label: "Ogólne",
    href: ROUTE_SEGMENTS.guild.settings,
  },
  {
    id: "roles",
    label: "Role",
    href: `${ROUTE_SEGMENTS.guild.settings}${ROUTE_SEGMENTS.guild.roles}`,
  },
  {
    id: "lootlog",
    label: "Ustawienia potworów i NPC",
    href: `${ROUTE_SEGMENTS.guild.settings}${ROUTE_SEGMENTS.guild.npcs}`,
  },
  {
    id: "map-templates",
    label: "Szablony map",
    href: `${ROUTE_SEGMENTS.guild.settings}/map-templates`,
  },
  {
    id: "members",
    label: "Członkowie",
    href: `${ROUTE_SEGMENTS.guild.settings}${ROUTE_SEGMENTS.guild.members}`,
  },
];

export const SettingsLayout: React.FC = () => {
  const guildId = useGuildId();

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <HorizontalMenu
        items={NAV_ELEMENTS}
        basePath={`/${guildId}`}
        ariaLabel="Ustawienia"
        className="shrink-0"
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
