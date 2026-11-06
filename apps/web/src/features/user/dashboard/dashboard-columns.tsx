import type { ReactNode } from "react";
import { cn } from "cn";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";

// From `xl` each column fills the screen under the bands above it and
// scrolls on its own, so the feed and the rule between the columns reach the
// bottom of the page.
const COLUMN_CLASS = "min-w-0 xl:min-h-0 xl:overflow-y-auto custom-scrollbar";

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
  <StatsSectionColumns className="xl:min-h-120 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_clamp(440px,22vw,520px)] xl:grid-rows-[minmax(0,1fr)]">
    <div className={cn(COLUMN_CLASS, "max-xl:order-2")}>{feed}</div>
    <div className={cn(COLUMN_CLASS, "max-xl:contents")}>
      <div className="min-w-0 max-xl:order-1">{reservations}</div>
      <div className="min-w-0 max-xl:order-3">{aside}</div>
    </div>
  </StatsSectionColumns>
);
