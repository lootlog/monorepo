import { Outlet } from "@tanstack/react-router";

export const ReservationsLayout = () => {
  return (
    <div className="h-[calc(100dvh-3.5rem)] w-full">
      <Outlet />
    </div>
  );
};
