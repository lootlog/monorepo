import { cn } from "cn";
import type { FC } from "react";
import type { BattleSegmentValue } from "./utils/battle-team-summary";
import { formatNumber } from "@/components/battle/utils/value-utils";

export type BattleSummaryCompositionProps = {
  /** Background class per segment key; shared by the bar and its legend. */
  colors: Record<string, string>;
  getLabel: (key: string) => string;
  segments: BattleSegmentValue<string>[];
  teamClassName: string;
  teamLabel: string;
};

const formatShare = (share: number) => `${Math.round(share * 100)}%`;

export const BattleSummaryComposition: FC<BattleSummaryCompositionProps> = ({
  colors,
  getLabel,
  segments,
  teamClassName,
  teamLabel,
}) => {
  if (segments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className={cn("truncate text-xs font-semibold", teamClassName)}>
        {teamLabel}
      </span>
      <div
        className="flex h-2.5 gap-px overflow-hidden rounded-full"
        aria-hidden
      >
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={colors[segment.key]}
            style={{ width: `${segment.share * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-full", colors[segment.key])}
              aria-hidden
            />
            {getLabel(segment.key)}
            <span className="font-semibold tabular-nums text-foreground">
              {formatShare(segment.share)}
            </span>
            <span className="tabular-nums">
              ({formatNumber(segment.value)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
