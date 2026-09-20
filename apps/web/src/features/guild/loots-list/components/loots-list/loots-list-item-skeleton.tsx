import { SectionCard as Card } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { ItemSilhouetteSkeleton } from "./item-silhouette-skeleton";
import { PlayerSilhouetteSkeleton } from "./player-silhouette-skeleton";

type Props = {
  index?: number;
};

// Party sizes vary card to card so the placeholder reads like a real list.
const PLAYER_COUNTS = [10, 1, 10, 3, 6, 2, 8, 4];

const TITLE_WIDTHS = ["w-36", "w-28", "w-44", "w-32"];

const LOCATION_WIDTHS = ["w-44", "w-56", "w-36", "w-48"];

/**
 * Mirrors the loot card layout class for class so the list does not shift
 * when real cards replace the placeholders.
 */
export const LootsListItemSkeleton: React.FC<Props> = ({ index = 0 }) => {
  const playersCount = PLAYER_COUNTS[index % PLAYER_COUNTS.length] ?? 1;
  const titleWidth = TITLE_WIDTHS[index % TITLE_WIDTHS.length];
  const locationWidth = LOCATION_WIDTHS[index % LOCATION_WIDTHS.length];

  return (
    <Card
      aria-hidden="true"
      className="flex h-full flex-col gap-0 rounded-xl border-border bg-card px-4 pt-2 pb-1"
    >
      <div className="mb-1 flex min-h-9 flex-row items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className={`h-4 ${titleWidth}`} />
          {index % 2 === 0 && <Skeleton className="h-5 w-12 rounded-md" />}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Skeleton className="h-9 w-14 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl sm:w-28" />
        </div>
      </div>

      <div className="-mx-4 flex flex-1 flex-row justify-between gap-4 border-t border-border/30 px-4 py-2">
        <div className="flex flex-row flex-wrap items-start gap-2">
          {Array.from({ length: playersCount }, (_, playerIndex) => (
            <div
              key={playerIndex}
              className="flex flex-col items-center gap-0.5"
            >
              <PlayerSilhouetteSkeleton />
              <ItemSilhouetteSkeleton />
            </div>
          ))}
        </div>
      </div>

      <div className="-mx-4 mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/30 px-4 py-1.5">
        <div className="flex min-h-4 min-w-0 flex-1 basis-40 items-center">
          <Skeleton className={`h-3 ${locationWidth}`} />
        </div>
        <div className="flex min-h-4 shrink-0 items-center gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </Card>
  );
};
