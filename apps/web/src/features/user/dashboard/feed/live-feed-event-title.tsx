import { formatLevel } from "@lootlog/domain/profession";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FeedGroup } from "./live-feed-state";

type Props = {
  group: FeedGroup;
  npc: FeedGroup["loots"][number]["npc"];
};

/** Opens the loot when one was recorded, otherwise the NPC statistics. */
export function LiveFeedEventTitle({ group, npc }: Props) {
  const { t } = useTranslation();
  const [loot] = group.loots;
  const name = npc?.name ?? t("statistics.feedLoot");
  const kill = group.kill;

  const target = loot ? (
    <Link
      to="/$guildId"
      params={{ guildId: loot.guild.vanityUrl ?? loot.guild.id }}
      search={{ lootId: loot.lootId }}
    />
  ) : (
    <Link
      to="/$guildId/stats/npcs/$npcId"
      params={{
        guildId: kill?.guild.vanityUrl ?? kill?.guild.id ?? "",
        npcId: String(npc?.id ?? ""),
      }}
    />
  );

  return (
    <TextLink
      className="min-w-0 break-words text-sm font-bold text-foreground"
      aria-label={t(loot ? "statistics.feedLootOf" : "statistics.feedKill", {
        name,
      })}
      render={target}
    >
      {name}
      {npc?.lvl !== null && npc?.lvl !== undefined && (
        <span className="ml-1 font-medium text-muted-foreground">
          ({formatLevel(npc.lvl, npc.prof)})
        </span>
      )}
    </TextLink>
  );
}
