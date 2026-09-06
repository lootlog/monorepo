import { NpcTile } from "@/components/tiles/npc-tile";
import { LootMetaItem } from "@/features/guild/loots-list/components/loots-list/loot-meta-item";
import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { LiveFeedTime } from "./live-feed-time";
import upperFirst from "lodash/upperFirst";
import { Calendar, Dot, Globe, Swords } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LiveFeedOrganizations } from "./live-feed-organizations";

type Props = {
  item: Extract<UserFeedResponseDtoOutput["items"][number], { type: "kill" }>;
  now: number;
  organizations: UserFeedResponseDtoOutput["items"][number]["guild"][];
};

export const LiveFeedKillRow = ({ item, now, organizations }: Props) => {
  const { t } = useTranslation();
  const guildId = item.guild.vanityUrl ?? item.guild.id;
  return (
    <div className="group relative flex flex-col gap-0 px-4 pt-2 pb-1 transition-colors hover:bg-muted/20">
      <div className="-mx-4 -mt-2 flex flex-wrap items-center px-4 py-2 justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          {item.npc.icon ? (
            <NpcTile
              npc={{
                name: item.npc.name,
                icon: item.npc.icon,
                lvl: item.npc.lvl ?? undefined,
              }}
            />
          ) : (
            <Swords
              className="size-5 shrink-0 text-muted-foreground"
              aria-hidden
            />
          )}
          <TextLink
            className="min-w-0 break-words text-sm font-bold text-foreground"
            aria-label={t("statistics.feedKill", { name: item.npc.name })}
            render={
              <Link
                to="/$guildId/stats/npcs/$npcId"
                params={{ guildId, npcId: String(item.npc.id) }}
              />
            }
          >
            {item.npc.name}
            {item.npc.lvl !== null && (
              <span className="ml-1">
                ({item.npc.lvl}
                {item.npc.prof?.charAt(0).toLowerCase() ?? ""})
              </span>
            )}
          </TextLink>
        </div>
        <LiveFeedOrganizations organizations={organizations} />
      </div>
      <div className="-mx-4 mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/30 px-4 py-1">
        <LootMetaItem icon={Globe}>{upperFirst(item.world)}</LootMetaItem>
        <div className="flex items-center gap-2">
          <LootMetaItem icon={Calendar}>
            <LiveFeedTime occurredAt={item.occurredAt} now={now} />
          </LootMetaItem>
          <Dot className="shrink-0 text-muted-foreground" aria-hidden />
          <LootMetaItem icon={Swords} title={t("statistics.kills")}>
            ×{item.count}
          </LootMetaItem>
        </div>
      </div>
    </div>
  );
};
