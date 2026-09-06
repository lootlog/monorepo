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
}) => (
  <div className="flex items-center justify-between gap-3 mt-auto border-t border-border/30 -mx-4 px-4 py-1">
    <div className="flex min-w-0 flex-1 items-center gap-0">
      <LootMetaItem icon={MapPin} className="min-w-0 flex-1" title={location}>
        <span className="truncate">{location}</span>
      </LootMetaItem>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <LootMetaItem icon={Calendar}>{date}</LootMetaItem>
      <Dot className="shrink-0 text-muted-foreground" />
      <LootMetaItem icon={Users}>{playersCount}</LootMetaItem>
      <Dot className="shrink-0 text-muted-foreground" />
      <LootMetaItem icon={Package}>{itemsCount}</LootMetaItem>
    </div>
  </div>
);
