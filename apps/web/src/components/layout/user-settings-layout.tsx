import { PageHeader } from "@/components/layout/page-header";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { Outlet } from "@tanstack/react-router";
import { HorizontalMenu } from "@/components/layout/horizontal-menu";

const NAV_ELEMENTS = [
  {
    id: "appearance",
    label: "Wygląd",
    href: "/settings/appearance",
  },
];

export const UserSettingsLayout: React.FC = () => {
  return (
    <div className="flex flex-row w-full h-full min-h-0">
      <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
        <PageHeader>
          <div className="flex flex-row gap-2 items-center justify-center">
            <SidebarTrigger />
            <h1 className="font-semibold p-0">Ustawienia</h1>
          </div>
        </PageHeader>
        <HorizontalMenu
          items={NAV_ELEMENTS}
          basePath={`/@me`}
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
