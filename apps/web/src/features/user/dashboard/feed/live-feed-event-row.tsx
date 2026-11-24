import { activityFeedNpcCategory } from "@lootlog/domain/activity-feed";
import { Skull } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { NpcTile } from "@/components/tiles/npc-tile";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_HOVER_CLASS,
} from "@lootlog/ui/lib/list-tile";
import { LOOT_RARITY_SURFACE_CLASS } from "@lootlog/ui/lib/item-rarity-colors";
import { npcCategoryAppearance } from "../npc-category-appearance";
import { LiveFeedEventLoot } from "./live-feed-event-loot";
import { LiveFeedEventMeta } from "./live-feed-event-meta";
import { LiveFeedEventTitle } from "./live-feed-event-title";
import { LiveFeedOrganizations } from "./live-feed-organizations";
import { describeFeedGroup, type FeedGroup } from "./live-feed-state";

type Props = {
  group: FeedGroup;
  now: number;
};

export function LiveFeedEventRow({ group, now }: Props) {
  const { t } = useTranslation();
  const { npc, world, location, legendary } = describeFeedGroup(group);

  const category = activityFeedNpcCategory(npc?.type);
  const appearance = npcCategoryAppearance(category);
  const count = group.kill?.count ?? 0;

  return (
    <div
      className={cn(
        "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 @lg:grid-cols-[2.5rem_minmax(0,1fr)_auto_auto]",
        LIST_TILE_HOVER_CLASS,
        LIST_TILE_INSET_CLASS,
        legendary && LOOT_RARITY_SURFACE_CLASS.LEGENDARY,
      )}
      style={appearance.style}
    >
      <span className="flex size-10 items-center justify-center">
        {npc?.icon ? (
          <NpcTile
            npc={{ name: npc.name, icon: npc.icon, lvl: npc.lvl ?? undefined }}
          />
        ) : (
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-lg",
              appearance.surface,
              appearance.color,
            )}
          >
            <Skull aria-hidden="true" className="size-5" />
          </span>
        )}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <LiveFeedEventTitle group={group} npc={npc} />
          {count > 1 && (
            <span
              className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground"
              title={t("statistics.kills")}
            >
              ×{count}
            </span>
          )}
        </div>
        <LiveFeedEventMeta
          type={npc?.type ? t(`npcType.${npc.type}`) : undefined}
          typeClassName={appearance.color}
          world={world}
          location={location}
          occurredAt={group.occurredAt}
          now={now}
        />
      </div>
      {group.loots.length > 0 && (
        <div className="col-span-2 col-start-2 row-start-2 flex min-w-0 @lg:col-span-1 @lg:col-start-3 @lg:row-start-1 @lg:justify-end">
          <LiveFeedEventLoot loots={group.loots} />
        </div>
      )}
      <div className="col-start-3 row-start-1 @lg:col-start-4">
        <LiveFeedOrganizations organizations={group.organizations} />
      </div>
    </div>
  );
}
