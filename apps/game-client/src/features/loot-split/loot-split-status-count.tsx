import { cn } from "cn";
import type { FC } from "react";
import { useCountBump } from "@/hooks/ui/use-count-bump";
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
}) => {
  const countRef = useCountBump<HTMLSpanElement>(count);

  return (
    <span
      title={label}
      className={cn(
        "ll:flex ll:items-center ll:gap-0.5 ll:tabular-nums",
        className,
      )}
    >
      <LootSplitStatusIcon status={status} />
      <span ref={countRef} key={count} aria-hidden>
        {count}
      </span>
      <span className="ll:sr-only">{label}</span>
    </span>
  );
};
