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
      {/* Never taller than the page view under the app bar (3.5rem, which
          the page viewport insets) and the tabs, so a short screen scrolls
          the rail instead of hiding its last rows. */}
      <div className="xl:sticky xl:top-[calc(var(--page-sticky-top)+var(--filter-bar-height,0px)-1px)] xl:max-h-[calc(100dvh-3.5rem-var(--page-sticky-top)-var(--filter-bar-height,0px)+1px)] xl:overflow-y-auto">
        {/* The rail is its own scroller, so its section heading pins to its
            top rather than the page's offset. */}
        <div className="xl:[--filter-bar-height:0px] xl:[--page-sticky-top:0px]">
          {ranking}
        </div>
      </div>
    </aside>
  </StatsSectionColumns>
);
