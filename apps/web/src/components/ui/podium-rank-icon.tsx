import type { ReactNode } from "react";
import { Crown, Medal, Trophy } from "lucide-react";
import { cn } from "cn";

type PodiumRankIconProps = {
  rank: number;
  className?: string;
  fallback?: ReactNode;
};

export const PodiumRankIcon = ({
  rank,
  className,
  fallback = null,
}: PodiumRankIconProps) => {
  const iconClassName = cn("size-4", className);

  if (rank === 1) {
    return <Crown className={cn(iconClassName, "text-yellow-500")} />;
  }

  if (rank === 2) {
    return <Trophy className={cn(iconClassName, "text-slate-400")} />;
  }

  if (rank === 3) {
    return <Medal className={cn(iconClassName, "text-amber-600")} />;
  }

  return fallback;
};
