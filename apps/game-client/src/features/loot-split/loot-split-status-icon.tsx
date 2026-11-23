import { Check, CircleHelp, Clock, Funnel, Hourglass } from "lucide-react";
import type { FC } from "react";
import type { LootSplitStatus } from "./loot-split-model";

export const LootSplitStatusIcon: FC<{
  status: LootSplitStatus;
  byLootFilter?: boolean;
}> = ({ status, byLootFilter = false }) => {
  if (status === "accepted" && byLootFilter)
    return (
      <Funnel aria-hidden className="ll:size-3.5 ll:shrink-0 ll:text-success" />
    );

  if (status === "accepted")
    return (
      <Check aria-hidden className="ll:size-3.5 ll:shrink-0 ll:text-success" />
    );

  if (status === "choosing")
    return (
      <Hourglass
        aria-hidden
        className="ll:size-3.5 ll:shrink-0 ll:text-amber-400"
      />
    );

  if (status === "timedOut")
    return (
      <Clock aria-hidden className="ll:size-3.5 ll:shrink-0 ll:text-rose-300" />
    );

  return (
    <CircleHelp
      aria-hidden
      className="ll:size-3.5 ll:shrink-0 ll:text-foreground/40"
    />
  );
};
