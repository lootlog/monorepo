import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";

/**
 * A text placeholder exactly one line box of its surrounding text tall, so the
 * loaded text takes the same height. Size the bar with `className`.
 */
export const SkeletonLine = ({ className }: { className?: string }) => (
  <span className="flex h-lh items-center">
    <Skeleton render={<span />} className={cn("block", className)} />
  </span>
);
