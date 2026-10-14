import type { ReactNode } from "react";
import { DetailBar } from "./detail-bar";

type DetailSkeletonProps = {
  meta: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

/** Route-level stand-in for `DetailPage`: its details row and sections. */
export const DetailSkeleton = ({
  meta,
  actions,
  children,
}: DetailSkeletonProps) => (
  <div aria-busy="true" className="min-h-0 flex-1 overflow-clip">
    <DetailBar meta={meta} actions={actions} />
    {children}
  </div>
);
