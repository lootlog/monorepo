import type { ReactNode } from "react";

export const SettingsTabSkeleton = ({ children }: { children: ReactNode }) => (
  <div aria-busy="true">{children}</div>
);
