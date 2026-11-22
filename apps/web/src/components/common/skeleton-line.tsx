import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

export const SkeletonLine = ({ className }: { className?: string }) => (
  <span className="flex h-lh items-center">
    <Skeleton render={<span />} className={cn("block", className)} />
  </span>
);
