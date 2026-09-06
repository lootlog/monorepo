import { ItemTile } from "@/components/tiles/item-tile";
import { LootNpcs } from "@/features/guild/loots-list/components/loots-list/loot-npcs";
import { LootMetaItem } from "@/features/guild/loots-list/components/loots-list/loot-meta-item";
import type { LootPresentationData } from "@/features/guild/loots-list/components/loots-list/build-loot-presentation";
import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";
import { LiveFeedOrganizations } from "./live-feed-organizations";
import { LiveFeedTime } from "./live-feed-time";
import { Calendar, Dot, MapPin, Package, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";

type Props = {
  loot: LootPresentationData;
  now: number;
  organizations: UserFeedResponseDtoOutput["items"][number]["guild"][];
};

export const LiveFeedLootRow = ({ loot, now, organizations }: Props) => {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "group relative flex flex-col px-4 pt-2 pb-1 transition-colors hover:bg-muted/20",
        loot.items.some((item) => item.rarity === "LEGENDARY") &&
          "bg-red-500/5",
      )}
    >
      <div className="-mx-4 -mt-2 flex flex-wrap items-center px-4 py-2 gap-x-3 gap-y-2">
        <div className="min-w-0 max-w-full">
          <LootNpcs npcs={loot.npcs} showIcon />
        </div>
        <div className="ml-auto">
          <LiveFeedOrganizations organizations={organizations} />
        </div>
      </div>
      <ul
        className="-mx-4 flex flex-wrap items-center gap-1 border-t border-border/30 px-4 pt-2 pb-1"
        aria-label={t("statistics.feedItems")}
      >
        {loot.items.map((item, index) => (
          <li key={`${item.hid}:${index}`} className="flex">
            <ItemTile item={item} />
          </li>
        ))}
      </ul>
      <div className="-mx-4 mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/30 px-4 py-1">
        <LootMetaItem icon={MapPin} className="min-w-0" title={loot.location}>
          <span className="truncate">{loot.location}</span>
        </LootMetaItem>
        <div className="flex items-center gap-2">
          <LootMetaItem icon={Calendar}>
            <LiveFeedTime occurredAt={loot.createdAt} now={now} />
          </LootMetaItem>
          <Dot className="shrink-0 text-muted-foreground" aria-hidden />
          <LootMetaItem icon={Users}>{loot.players.length}</LootMetaItem>
          <Dot className="shrink-0 text-muted-foreground" aria-hidden />
          <LootMetaItem icon={Package}>{loot.items.length}</LootMetaItem>
        </div>
      </div>
    </div>
  );
};
