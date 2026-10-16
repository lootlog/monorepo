import type { ReactNode } from "react";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";

/**
 * The feed beside a column of what the player checks at a glance. Narrower
 * pages stack them with the upcoming reservations before the feed.
 */
export const DashboardColumns = ({
  feed,
  reservations,
  aside,
}: {
  feed: ReactNode;
  reservations: ReactNode;
  aside: ReactNode;
}) => (
  <StatsSectionColumns className="xl:grid-cols-[minmax(0,1fr)_440px]">
    <div className="min-w-0 max-xl:order-2">{feed}</div>
    <div className="min-w-0 max-xl:contents">
      <div className="min-w-0 max-xl:order-1">{reservations}</div>
      <div className="min-w-0 max-xl:order-3">{aside}</div>
    </div>
  </StatsSectionColumns>
);
