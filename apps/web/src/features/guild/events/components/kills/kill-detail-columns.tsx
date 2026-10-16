import type { ReactNode } from "react";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";

type KillDetailColumnsProps = {
  participants: ReactNode;
  maps: ReactNode;
  rules: ReactNode;
  loots: ReactNode;
};

/**
 * Who took part and how the maps were covered beside the scoring rules and
 * the kill's loots. Narrower pages read participants, rules, loots, then the
 * long map table.
 */
export const KillDetailColumns = ({
  participants,
  maps,
  rules,
  loots,
}: KillDetailColumnsProps) => (
  <StatsSectionColumns className="xl:grid-cols-[minmax(0,1fr)_440px]">
    <div className="min-w-0 max-xl:contents">
      <div className="min-w-0 max-xl:order-1">{participants}</div>
      <div className="min-w-0 max-xl:order-4">{maps}</div>
    </div>
    <div className="min-w-0 max-xl:contents">
      <div className="min-w-0 max-xl:order-2">{rules}</div>
      <div className="min-w-0 max-xl:order-3">{loots}</div>
    </div>
  </StatsSectionColumns>
);
