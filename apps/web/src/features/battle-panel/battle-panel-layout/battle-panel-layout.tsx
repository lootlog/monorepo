import { Outlet } from "@tanstack/react-router";

export const BattlePanelLayout = () => {
  return (
    <div className="w-full h-full">
      <Outlet />
    </div>
  );
};
