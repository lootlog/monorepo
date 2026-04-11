import { Outlet } from "@tanstack/react-router";

export const ReservationsLayout = () => {
  return (
    <div className="w-full h-[calc(100vh-3.5rem)]">
      <Outlet />
    </div>
  );
};
