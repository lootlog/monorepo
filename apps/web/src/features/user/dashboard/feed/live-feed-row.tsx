import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";
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
const linkClass =
  "rounded-sm text-sm font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring";

export function LiveFeedRow({ item, now }: LiveFeedRowProps) {
  const { t } = useTranslation();
  const guildId = item.guild.vanityUrl ?? item.guild.id;
  const occurredAt = new Date(item.occurredAt);
  return (
    <li className="border-b border-border/50 p-3 last:border-b-0">
      <div className="flex items-start gap-3">
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
        <div className="min-w-0 flex-1 space-y-2">
          {item.type === "kill" ? (
            <Link
              className={linkClass}
              to="/$guildId/stats/npcs/$npcId"
              params={{ guildId, npcId: String(item.npc.id) }}
            >
              {t("statistics.feedKill", { name: item.npc.name })}
              {item.count > 1 && (
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                  ×{item.count}
                </span>
              )}
            </Link>
          ) : (
            <>
              <a
                className={linkClass}
                href={`/${encodeURIComponent(guildId)}?lootId=${item.lootId}`}
              >
                {t("statistics.feedLoot")}
                {item.npc && ` · ${item.npc.name}`}
              </a>
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
                    <span className="max-w-48 break-words">
                      {lootItem.name}
                    </span>
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
            </>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{item.world}</span>
            <span aria-hidden>·</span>
            <Link
              to="/$guildId"
              params={{ guildId }}
              className="rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.guild.name}
            </Link>
            <span aria-hidden>·</span>
            <time
              dateTime={item.occurredAt}
              title={dateFormatter.format(occurredAt)}
            >
              {formatDistanceStrict(occurredAt, new Date(now), {
                addSuffix: true,
                locale: pl,
              })}
            </time>
          </div>
        </div>
      </div>
    </li>
  );
}
