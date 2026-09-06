import { Outlet } from "@tanstack/react-router";

export const ReservationsLayout = () => {
  return (
    <div className="h-full min-h-0 min-w-0 w-full">
      <Outlet />
    </div>
  );
};
