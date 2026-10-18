import type { ReactNode } from "react";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";

type EventOverviewRailProps = {
  heroes: ReactNode;
  ranking: ReactNode;
  /** Sections under the heroes, such as recent kills and loots. */
  activity: ReactNode;
};

/**
 * The overview's sections at their own height, with the ranking in a rail
 * that stays in view from `xl`. Narrower pages stack heroes, ranking, then
 * the activity.
 */
export const EventOverviewRail = ({
  heroes,
  ranking,
  activity,
}: EventOverviewRailProps) => (
  <StatsSectionColumns className="xl:grid-cols-[minmax(0,1fr)_420px]">
    <div className="min-w-0 max-xl:contents">
      <div className="min-w-0 max-xl:order-1">{heroes}</div>
      <div className="min-w-0 max-xl:order-3">{activity}</div>
    </div>
    <aside className="min-w-0 max-xl:order-2">
      <div className="xl:sticky xl:top-[calc(var(--page-sticky-top)+var(--filter-bar-height,0px)-1px)]">
        {ranking}
      </div>
    </aside>
  </StatsSectionColumns>
);
