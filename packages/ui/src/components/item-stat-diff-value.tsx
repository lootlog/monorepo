import { cn } from "cn";
import type { FC } from "react";

const signed = (number: number) => (number > 0 ? `+${number}` : `${number}`);

const diffTone = (diff: readonly number[]) => {
  if (diff.every((number) => number >= 0)) return "text-emerald-400";

  if (diff.every((number) => number <= 0)) return "text-red-400";

  return "text-muted-foreground";
};

type ItemStatDiffValueProps = {
  diff: readonly number[];
};

export const ItemStatDiffValue: FC<ItemStatDiffValueProps> = ({ diff }) => (
  <span className={cn("font-semibold tabular-nums", diffTone(diff))}>
    ({diff.map(signed).join(" - ")})
  </span>
);
