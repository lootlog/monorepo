import { Outlet } from "@tanstack/react-router";
import { HorizontalMenu } from "@/components/layout/horizontal-menu";
import { ROUTE_SEGMENTS } from "@/config/routes";

const NAV_ELEMENTS = [
  {
    id: "appearance",
    label: "Wygląd",
    href: `${ROUTE_SEGMENTS.user.settings}${ROUTE_SEGMENTS.user.appearance}`,
  },
];

export const UserSettingsLayout: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-background/50">
      <HorizontalMenu
        items={NAV_ELEMENTS}
        basePath={ROUTE_SEGMENTS.user.base}
        ariaLabel="Ustawienia"
        className="shrink-0"
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
};
