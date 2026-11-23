import type { FC } from "react";
import { cn } from "cn";
import { useCountBump } from "@/hooks/ui/use-count-bump";

export const COUNT_BADGE_CLASS_NAME =
  "ll:inline-flex ll:min-w-3.5 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-full ll:bg-unread ll:px-1 ll:text-[9px] ll:font-bold ll:leading-3.5 ll:text-foreground ll:tabular-nums";

type CountBadgeProps = {
  count: number;
};

export const CountBadge: FC<CountBadgeProps> = ({ count }) => {
  const badgeRef = useCountBump<HTMLSpanElement>(count);

  if (count <= 1) {
    return null;
  }

  return (
    <span
      ref={badgeRef}
      className={cn(
        COUNT_BADGE_CLASS_NAME,
        "ll:px-[var(--ll-chat-space-md,6px)] ll:text-[length:var(--ll-chat-detail-font-size,10px)]",
      )}
      key={count}
    >
      x{count}
    </span>
  );
};
