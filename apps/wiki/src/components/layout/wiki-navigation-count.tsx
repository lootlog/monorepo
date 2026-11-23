import { useChangeCount } from "@lootlog/ui/hooks/use-change-count";
import { cn } from "cn";

type WikiNavigationCountProps = {
  count: number;
};

export function WikiNavigationCount({ count }: WikiNavigationCountProps) {
  const changes = useChangeCount(count);

  if (count === 0) return null;

  return (
    <span
      key={changes}
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-primary/12 px-1.5 text-xs font-semibold text-primary tabular-nums",
        changes > 0 && "animate-bump motion-reduce:animate-none",
      )}
    >
      {count}
    </span>
  );
}
