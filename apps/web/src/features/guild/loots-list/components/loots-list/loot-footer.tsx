import { useTranslation } from "react-i18next";
import { upperFirst } from "es-toolkit";
import { Calendar, Globe, MapPin, Users, Package } from "lucide-react";
import { cn } from "cn";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { MetaItem } from "@/components/common/meta-item";

export const LootFooter = ({
  world,
  location,
  date,
  playersCount,
  itemsCount,
}: {
  /** Shown when the list spans every world. */
  world?: string;
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
        LIST_TILE_INSET_CLASS,
      )}
    >
      {/* One row: the location truncates and the counters keep their width. */}
      {world && (
        <MetaItem
          icon={Globe}
          label={t("loots.list.worldLabel")}
          className="min-h-5 shrink-0"
        >
          {upperFirst(world)}
        </MetaItem>
      )}
      <MetaItem
        icon={MapPin}
        className="min-h-5 min-w-0 flex-1"
        title={location}
      >
        <span className="min-w-0 truncate">{location}</span>
      </MetaItem>
      <div className="flex min-h-5 shrink-0 items-center gap-x-3">
        <MetaItem icon={Calendar}>{date}</MetaItem>
        <MetaItem icon={Users} label={t("statistics.feedPlayersCountLabel")}>
          {playersCount}
        </MetaItem>
        <MetaItem icon={Package} label={t("statistics.feedItemsCountLabel")}>
          {itemsCount}
        </MetaItem>
      </div>
    </div>
  );
};
