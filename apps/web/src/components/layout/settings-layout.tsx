import { Outlet } from "@tanstack/react-router";

/**
 * Each settings tab renders the tabs at the top of its own page scroller;
 * role, monster and member pages show a back arrow instead.
 */
export const SettingsLayout: React.FC = () => (
  <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
    <Outlet />
  </div>
);
