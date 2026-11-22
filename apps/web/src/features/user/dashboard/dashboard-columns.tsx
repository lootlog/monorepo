import type { ReactNode } from "react";
import { cn } from "cn";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";

const COLUMN_CLASS = "min-w-0 xl:min-h-0 xl:overflow-y-auto custom-scrollbar";

export const DashboardColumns = ({
  feed,
  reservations,
  aside,
}: {
  feed: ReactNode;
  reservations: ReactNode;
  aside: ReactNode;
}) => (
  <StatsSectionColumns className="xl:min-h-120 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_clamp(440px,22vw,520px)] xl:grid-rows-[minmax(0,1fr)]">
    <div className={cn(COLUMN_CLASS, "max-xl:order-2")}>{feed}</div>
    <div className={cn(COLUMN_CLASS, "max-xl:contents")}>
      <div className="min-w-0 max-xl:order-1">{reservations}</div>
      <div className="min-w-0 max-xl:order-3">{aside}</div>
    </div>
  </StatsSectionColumns>
);
