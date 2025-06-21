import { PageHeader } from "@/components/layout/page-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useGuildId } from "@/hooks/use-guild-id";
import { Button } from "@lootlog/ui/components/button";
import { Link, Outlet, useLocation } from "react-router-dom";

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
    label: "Lootlog",
    href: "/settings/lootlog",
  },
];

export const SettingsLayout: React.FC = () => {
  const guildId = useGuildId();
  const { pathname } = useLocation();

  return (
    <div className="flex flex-row w-full h-[calc(100%)]">
      <div className="w-full h-full flex flex-col">
        <PageHeader>
          <div className="flex flex-row gap-2">
            <SidebarTrigger />
            <h1 className="font-semibold p-0">Ustawienia</h1>
          </div>
        </PageHeader>
        <div className="p-2 flex flex-row gap-2 border-b">
          {NAV_ELEMENTS.map((navElement) => {
            const url = `/${guildId}${navElement.href}`;
            const active = pathname === url;

            return (
              <Link key={navElement.id} to={url}>
                <Button
                  className="w-full"
                  size="sm"
                  variant={active ? "default" : "ghost"}
                >
                  {navElement.label}
                </Button>
              </Link>
            );
          })}
        </div>
        <ScrollArea className="flex w-full flex-1">
          <Outlet />
        </ScrollArea>
      </div>
    </div>
  );
};
