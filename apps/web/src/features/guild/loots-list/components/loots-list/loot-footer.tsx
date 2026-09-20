import { useTranslation } from "react-i18next";
import { Calendar, MapPin, Users, Package, Dot } from "lucide-react";
import { LootMetaItem } from "./loot-meta-item";

export const LootFooter = ({
  location,
  date,
  playersCount,
  itemsCount,
}: {
  location: string;
  date: string;
  playersCount: number;
  itemsCount: number;
}) => {
  const { t } = useTranslation();

  return (
    <div className="-mx-4 mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/30 px-4 py-1.5">
      {/* The location keeps a readable width and the counters wrap under it on narrow cards. */}
      <div className="flex min-h-4 min-w-0 flex-1 basis-40 items-center">
        <LootMetaItem icon={MapPin} className="min-w-0 flex-1" title={location}>
          <span className="truncate">{location}</span>
        </LootMetaItem>
      </div>
      <div className="flex min-h-4 shrink-0 items-center gap-2">
        <LootMetaItem icon={Calendar}>{date}</LootMetaItem>
        <Dot className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <LootMetaItem
          icon={Users}
          label={t("statistics.feedPlayersCountLabel")}
        >
          {playersCount}
        </LootMetaItem>
        <Dot className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <LootMetaItem
          icon={Package}
          label={t("statistics.feedItemsCountLabel")}
        >
          {itemsCount}
        </LootMetaItem>
      </div>
    </div>
  );
};
