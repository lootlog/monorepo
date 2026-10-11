import { useTranslation } from "react-i18next";
import { Calendar, MapPin, Users, Package } from "lucide-react";
import { cn } from "cn";
import {
  LOOT_CARD_DIVIDER_CLASS,
  LOOT_CARD_INSET_CLASS,
} from "@/features/guild/loots-list/loots-list-layout";
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
    <div
      className={cn(
        "mt-auto flex items-center justify-between gap-4 py-1.5",
        LOOT_CARD_DIVIDER_CLASS,
        LOOT_CARD_INSET_CLASS,
      )}
    >
      {/* One row: the location truncates and the counters keep their width. */}
      <LootMetaItem
        icon={MapPin}
        className="min-h-5 min-w-0 flex-1"
        title={location}
      >
        <span className="min-w-0 truncate">{location}</span>
      </LootMetaItem>
      <div className="flex min-h-5 shrink-0 items-center gap-x-3">
        <LootMetaItem icon={Calendar}>{date}</LootMetaItem>
        <LootMetaItem
          icon={Users}
          label={t("statistics.feedPlayersCountLabel")}
        >
          {playersCount}
        </LootMetaItem>
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
