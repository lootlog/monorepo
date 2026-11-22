import { cn } from "cn";
import type { FC } from "react";
import type { LootSplitStatus } from "./loot-split-model";
import { LootSplitStatusIcon } from "./loot-split-status-icon";

type LootSplitStatusCountProps = {
  status: LootSplitStatus;
  count: number;
  label: string;
  className: string;
};

export const LootSplitStatusCount: FC<LootSplitStatusCountProps> = ({
  status,
  count,
  label,
  className,
}) => (
  <span
    title={label}
    className={cn(
      "ll:flex ll:items-center ll:gap-0.5 ll:tabular-nums",
      className,
    )}
  >
    <LootSplitStatusIcon status={status} />
    <span aria-hidden>{count}</span>
    <span className="ll:sr-only">{label}</span>
  </span>
);
