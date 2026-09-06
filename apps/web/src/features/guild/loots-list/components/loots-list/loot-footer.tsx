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
    <div className="flex items-center justify-between gap-3 mt-auto border-t border-border/30 -mx-4 px-4 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-0">
        <LootMetaItem icon={MapPin} className="min-w-0 flex-1" title={location}>
          <span className="truncate">{location}</span>
        </LootMetaItem>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <LootMetaItem icon={Calendar}>{date}</LootMetaItem>
        <Dot className="shrink-0 text-muted-foreground" aria-hidden />
        <LootMetaItem
          icon={Users}
          label={t("statistics.feedPlayersCountLabel")}
        >
          {playersCount}
        </LootMetaItem>
        <Dot className="shrink-0 text-muted-foreground" aria-hidden />
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
