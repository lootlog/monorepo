import type { ReactNode } from "react";

/** Route-level stand-in for a settings tab's content under the tabs. */
export const SettingsTabSkeleton = ({ children }: { children: ReactNode }) => (
  <div aria-busy="true">{children}</div>
);
