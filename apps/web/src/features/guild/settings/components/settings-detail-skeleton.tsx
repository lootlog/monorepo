import type { ReactNode } from "react";
import { SettingsDetailBar } from "./settings-detail-bar";

type SettingsDetailSkeletonProps = {
  meta: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/** Route-level stand-in for `SettingsDetailPage`: its details row and sections. */
export const SettingsDetailSkeleton = ({
  meta,
  actions,
  children,
}: SettingsDetailSkeletonProps) => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-clip">
    <SettingsDetailBar meta={meta} actions={actions} />
    {children}
  </div>
);
