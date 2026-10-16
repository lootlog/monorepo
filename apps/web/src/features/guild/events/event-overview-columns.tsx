import type { ReactNode } from "react";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";

type EventOverviewColumnsProps = {
  heroes: ReactNode;
  loots: ReactNode;
  ranking: ReactNode;
  kills: ReactNode;
};

/**
 * The heroes and loots beside the ranking and kills. From `xl` the ranking
 * column sets the height: the loots column takes no height of its own, fills
 * the row, and fades out the loots that do not fit, so both columns end
 * together. Narrower pages stack heroes, ranking, kills, then loots.
 */
export const EventOverviewColumns = ({
  heroes,
  loots,
  ranking,
  kills,
}: EventOverviewColumnsProps) => (
  <StatsSectionColumns className="xl:grid-cols-[minmax(0,1fr)_440px]">
    <div className="min-w-0 max-xl:contents xl:h-0 xl:min-h-full xl:overflow-clip xl:[mask-image:linear-gradient(to_bottom,black_calc(100%-6rem),transparent)]">
      <div className="min-w-0 max-xl:order-1">{heroes}</div>
      <div className="min-w-0 max-xl:order-4">{loots}</div>
    </div>
    <div className="min-w-0 max-xl:contents">
      <div className="min-w-0 max-xl:order-2">{ranking}</div>
      <div className="min-w-0 max-xl:order-3">{kills}</div>
    </div>
  </StatsSectionColumns>
);
