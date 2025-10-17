import { PageHeader } from "@/components/layout/page-header";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { Outlet } from "@tanstack/react-router";
import { HorizontalMenu } from "@/components/layout/horizontal-menu";

const NAV_ELEMENTS = [
  {
    id: "general",
    label: "Ogólne",
    href: "/settings",
  },
  {
    id: "roles",
    label: "Role",
    href: "/settings/roles",
  },
  {
    id: "lootlog",
    label: "Ustawienia potworów i NPC",
    href: "/settings/npcs",
  },
  {
    id: "members",
    label: "Członkowie",
    href: "/settings/members",
  },
];

export const SettingsLayout: React.FC = () => {
  const guildId = useGuildId();

  return (
    <div className="flex flex-row w-full h-full min-h-0">
      <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
        <PageHeader>
          <div className="flex flex-row gap-2">
            <SidebarTrigger />
            <h1 className="font-semibold p-0">Ustawienia</h1>
          </div>
        </PageHeader>
        <HorizontalMenu
          items={NAV_ELEMENTS}
          basePath={`/${guildId}`}
          ariaLabel="Ustawienia"
        />
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className="w-full flex-1 min-h-0 overflow-hidden">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};
