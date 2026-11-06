import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTabBarAccessory } from "@/hooks/context/use-tab-bar-accessory";

/**
 * Holds the schedule's actions within thumb reach on touch layouts: as the
 * tab bar's accessory on phones, otherwise pinned above the bottom edge.
 */
export const ScheduleActionDock = ({ children }: { children: ReactNode }) => {
  const accessory = useTabBarAccessory();

  if (accessory) {
    return createPortal(
      <div className="flex size-full justify-center">{children}</div>,
      accessory,
    );
  }

  return (
    <div
      data-slot="schedule-action-dock"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:fixed"
    >
      {children}
    </div>
  );
};
