import { SectionCard as Card } from "@/components/common/section-card/section-card";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { cn } from "cn";
import {
  LOOT_CARD_DIVIDER_CLASS,
  LOOT_CARD_INSET_CLASS,
  LOOT_INSET_ROOT_CLASS,
} from "@/features/guild/loots-list/loots-list-layout";
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
      className={cn(
        "flex h-full flex-col gap-0 rounded-xl border-border bg-card p-0",
        LOOT_INSET_ROOT_CLASS,
      )}
    >
      <div
        className={cn(
          "flex min-h-11 items-center justify-between gap-3 py-1.5",
          LOOT_CARD_INSET_CLASS,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className={`h-4 ${titleWidth}`} />
          {index % 2 === 0 && <Skeleton className="h-5 w-12 rounded-md" />}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Skeleton className="h-8 w-11 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-xl sm:w-24" />
        </div>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-wrap gap-x-4 gap-y-2.5 py-2.5",
          LOOT_CARD_DIVIDER_CLASS,
          LOOT_CARD_INSET_CLASS,
        )}
      >
        <div className="flex min-w-0 flex-1 basis-48 flex-wrap content-start gap-x-2 gap-y-2.5">
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

      <div
        className={cn(
          "mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5",
          LOOT_CARD_DIVIDER_CLASS,
          LOOT_CARD_INSET_CLASS,
        )}
      >
        <div className="flex min-h-5 min-w-0 flex-1 basis-40 items-center">
          <Skeleton className={`h-3 ${locationWidth}`} />
        </div>
        <div className="flex min-h-5 shrink-0 items-center gap-x-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </Card>
  );
};
