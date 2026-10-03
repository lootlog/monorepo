import { cn } from "cn";

type RankBadgeProps = {
  rank: number;
  className?: string;
};

/** A leaderboard position, with the podium places tinted. */
export const RankBadge = ({ rank, className }: RankBadgeProps) => (
  <span
    className={cn(
      "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
      rank === 1 && "bg-primary text-primary-foreground",
      (rank === 2 || rank === 3) && "bg-primary/15 text-primary",
      rank > 3 && "text-muted-foreground",
      className,
    )}
  >
    {rank}
  </span>
);
