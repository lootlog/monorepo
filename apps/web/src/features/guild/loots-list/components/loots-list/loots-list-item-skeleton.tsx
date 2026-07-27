import { Skeleton } from "@lootlog/ui/components/skeleton";

type Props = {
  index?: number;
};

export const LootsListItemSkeleton: React.FC<Props> = ({ index = 0 }) => {
  const ITEMS_COUNT = (index % 5) + 1;
  const PLAYERS_COUNT = (index % 4) + 1;

  return (
    <article className="rounded-xl border border-border/50 bg-card  p-4">
      <div className="flex flex-row justify-between items-start gap-2 mb-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="w-48 h-5 rounded-md bg-muted/50" />
          <div className="flex items-center gap-3">
            <Skeleton className="w-24 h-3 rounded-md bg-muted/30" />
            <Skeleton className="w-20 h-3 rounded-md bg-muted/30" />
          </div>
        </div>
        <Skeleton className="w-12 h-6 rounded-md bg-secondary/50" />
      </div>

      <div className="flex flex-row gap-2 mb-3">
        {[...Array(ITEMS_COUNT)].map((_, i) => (
          <Skeleton
            key={i}
            className="w-[36px] h-[36px] rounded-md bg-muted/50 border border-border/30"
          />
        ))}
      </div>

      <div className="flex flex-row items-center justify-between pt-3 border-t border-border/30">
        <div className="flex flex-row -space-x-2">
          {[...Array(PLAYERS_COUNT)].map((_, i) => (
            <Skeleton
              key={i}
              className="w-[32px] h-[48px] rounded-lg bg-muted/50 border border-border/30"
            />
          ))}
        </div>
        <Skeleton className="w-16 h-3 rounded-md bg-muted/30" />
      </div>
    </article>
  );
};
