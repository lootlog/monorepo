import { activityFeedNpcCategory } from "@lootlog/domain/activity-feed";
import { Swords } from "lucide-react";
import { NpcTypeIcon } from "@lootlog/ui/components/npc-type-icon";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { NpcTile } from "@/components/tiles/npc-tile";
import { LEGENDARY_LOOT_ROW_CLASS } from "@/features/guild/loots-list/loots-list-layout";
import { NPC_CATEGORY_APPEARANCE } from "../npc-category-appearance";
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
  const { npc, world, location, players, legendary } = describeFeedGroup(group);

  const category = activityFeedNpcCategory(npc?.type);
  const appearance = NPC_CATEGORY_APPEARANCE[category];
  const count = group.kill?.count ?? 0;

  return (
    <div
      className={cn(
        "grid grid-cols-[0.75rem_2.5rem_minmax(0,1fr)] gap-x-3 px-4 py-3 transition-colors hover:bg-muted/20",
        legendary && LEGENDARY_LOOT_ROW_CLASS,
      )}
    >
      <span className="flex justify-center pt-4" aria-hidden>
        <span
          className={cn(
            "relative size-3 rounded-full border-2 ring-4 ring-card",
            appearance.marker,
          )}
        />
      </span>
      <span className="flex min-h-10 items-start justify-center">
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
            <NpcTypeIcon type={category} className="size-8" />
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-start gap-2">
          <div className="flex min-h-8 min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <LiveFeedEventTitle group={group} npc={npc} />
            {npc?.type && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
                  appearance.surface,
                  appearance.color,
                )}
              >
                {t(`npcType.${npc.type}`)}
              </span>
            )}
            {count > 1 && (
              <span
                className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums"
                title={t("statistics.kills")}
              >
                <Swords className="size-3" aria-hidden />×{count}
              </span>
            )}
          </div>
          <LiveFeedOrganizations organizations={group.organizations} />
        </div>
        {group.loots.length > 0 && <LiveFeedEventLoot loots={group.loots} />}
        <LiveFeedEventMeta
          world={world}
          location={location}
          occurredAt={group.occurredAt}
          now={now}
          players={players}
          hasLoot={group.loots.length > 0}
        />
      </div>
    </div>
  );
}
