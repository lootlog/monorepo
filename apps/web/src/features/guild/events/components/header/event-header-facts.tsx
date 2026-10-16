import type { ReactNode } from "react";

/** The event's facts: one row on a wide bar, two by two on a narrow one. */
export const EventHeaderFacts = ({ children }: { children: ReactNode }) => (
  <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 @min-[36rem]/detail-bar:flex @min-[36rem]/detail-bar:w-auto @min-[36rem]/detail-bar:gap-0">
    {children}
  </div>
);
