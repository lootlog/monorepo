import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";
import upperFirst from "lodash/upperFirst";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { Package, Swords } from "lucide-react";
import { formatDistanceStrict } from "date-fns";
import { pl } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { ItemImage, ItemRarity } from "@lootlog/ui/components/item-image";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});
type LiveFeedRowProps = {
  item: UserFeedResponseDtoOutput["items"][number];
  now: number;
};

export function LiveFeedRow({ item, now }: LiveFeedRowProps) {
  const { t } = useTranslation();
  const guildId = item.guild.vanityUrl ?? item.guild.id;
  const occurredAt = new Date(item.occurredAt);
  return (
    <li className="border-b border-border/50 p-3 last:border-b-0">
      <div className="flex items-start gap-3">
        {item.type === "loot" && !item.npc ? (
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
            {item.type === "kill" ? (
              <Swords className="size-4" />
            ) : (
              <Package className="size-4" />
            )}
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            {item.type === "kill" ? (
              <TextLink
                className="min-w-0 break-words text-sm"
                aria-label={t("statistics.feedKill", { name: item.npc.name })}
                render={
                  <Link
                    to="/$guildId/stats/npcs/$npcId"
                    params={{ guildId, npcId: String(item.npc.id) }}
                  />
                }
              >
                {item.npc.name}
                {item.count > 1 && (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                    ×{item.count}
                  </span>
                )}
              </TextLink>
            ) : null}
            {item.type === "loot" && item.npc && (
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
            <time
              className="shrink-0 text-xs text-muted-foreground"
              dateTime={item.occurredAt}
              title={dateFormatter.format(occurredAt)}
            >
              {formatDistanceStrict(occurredAt, new Date(now), {
                addSuffix: true,
                locale: pl,
              })}
            </time>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{upperFirst(item.world)}</span>
            <span aria-hidden>·</span>
            <TextLink render={<Link to="/$guildId" params={{ guildId }} />}>
              {item.guild.name}
            </TextLink>
          </div>
          {item.type === "loot" && (
            <ul
              className="flex flex-wrap gap-2"
              aria-label={t("statistics.feedItems")}
            >
              {item.items.map((lootItem, index) => (
                <li
                  key={`${lootItem.id}:${index}`}
                  className="flex min-w-0 items-center gap-1.5 text-xs"
                >
                  <span aria-hidden>
                    <ItemImage
                      icon={lootItem.icon}
                      rarity={
                        Object.values(ItemRarity).find(
                          (rarity) => rarity === lootItem.rarity,
                        ) ?? ItemRarity.COMMON
                      }
                    />
                  </span>
                  <span className="sr-only">{lootItem.name}</span>
                </li>
              ))}
              {item.additionalItemsCount > 0 && (
                <li className="self-center text-xs text-muted-foreground">
                  {t("statistics.feedMoreItems", {
                    count: item.additionalItemsCount,
                  })}
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}
