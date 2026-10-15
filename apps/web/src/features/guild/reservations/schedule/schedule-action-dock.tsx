import type { ReactNode } from "react";

/**
 * Holds the schedule's actions above the bottom edge on touch layouts. Below
 * `md` the document scrolls the schedule, so the dock pins to the screen.
 */
export const ScheduleActionDock = ({ children }: { children: ReactNode }) => (
  <div
    data-slot="schedule-action-dock"
    className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:fixed"
  >
    {children}
  </div>
);
