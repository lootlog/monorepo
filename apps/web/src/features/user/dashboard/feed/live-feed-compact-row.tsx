import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";
import { LiveFeedOrganizations } from "./live-feed-organizations";
import upperFirst from "lodash/upperFirst";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { LiveFeedTime } from "./live-feed-time";
import { useTranslation } from "react-i18next";
import { LiveFeedItems } from "./live-feed-items";
import { NpcTile } from "@/components/tiles/npc-tile";

type LiveFeedCompactRowProps = {
  item: Extract<UserFeedResponseDtoOutput["items"][number], { type: "loot" }>;
  now: number;
  organizations?: UserFeedResponseDtoOutput["items"][number]["guild"][];
};

export function LiveFeedCompactRow({
  item,
  now,
  organizations,
}: LiveFeedCompactRowProps) {
  const { t } = useTranslation();
  const visibleOrganizations = organizations ?? [item.guild];
  const guildId = item.guild.vanityUrl ?? item.guild.id;
  return (
    <div className="p-3">
      <div className="flex items-start gap-3">
        {item.npc?.icon ? (
          <div className="flex w-8 shrink-0 justify-center">
            <NpcTile
              npc={{
                name: item.npc.name,
                icon: item.npc.icon,
                lvl: item.npc.lvl ?? undefined,
              }}
            />
          </div>
        ) : !item.npc ? (
          <TextLink
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted"
            aria-label={t("statistics.feedLoot")}
            render={
              <Link
                to="/$guildId"
                params={{ guildId }}
                search={{ lootId: item.lootId }}
              />
            }
          >
            <Package className="size-4" aria-hidden />
          </TextLink>
        ) : (
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
          >
            <Package className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            {item.npc && (
              <TextLink
                className="min-w-0 break-words text-sm"
                aria-label={`${t("statistics.feedLoot")} · ${item.npc.name}`}
                render={
                  <Link
                    to="/$guildId"
                    params={{ guildId }}
                    search={{ lootId: item.lootId }}
                  />
                }
              >
                {item.npc.name}
              </TextLink>
            )}
            <LiveFeedTime occurredAt={item.occurredAt} now={now} />
          </div>
          <LiveFeedItems item={item} />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {item.npc?.lvl !== undefined && item.npc.lvl !== null && (
              <>
                <span>{t("common.levelShort", { level: item.npc.lvl })}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <span>{upperFirst(item.world)}</span>
            <LiveFeedOrganizations organizations={visibleOrganizations} />
          </div>
        </div>
      </div>
    </div>
  );
}
