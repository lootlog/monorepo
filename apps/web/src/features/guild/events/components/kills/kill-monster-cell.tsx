import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Skull } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NpcTile } from "@/components/tiles";
import type { KillHistoryEntryHeroNpc } from "@lootlog/client/main";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";

type KillMonsterCellProps = {
  eventId: string;
  guildId: string;
  /**
   * Keeps the date under the name at every width, where no date column shows
   * it, such as in a preview card or a tile.
   */
  alwaysShowsDate?: boolean;
  kill: {
    heroNpc: Pick<KillHistoryEntryHeroNpc, "npcIcon" | "npcId" | "npcName">;
    heroNpcId: string;
    id: string;
    killedAt: string;
  };
};

export const KillMonsterCell = ({
  eventId,
  guildId,
  alwaysShowsDate = false,
  kill,
}: KillMonsterCellProps) => {
  const { t } = useTranslation();

  const detailLabel = t("events.kills.openKillDetails", {
    monsterName: kill.heroNpc.npcName,
  });

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-10 w-8 shrink-0 items-center justify-center">
        {kill.heroNpc.npcIcon ? (
          <NpcTile
            npc={{
              id: kill.heroNpc.npcId ?? undefined,
              name: kill.heroNpc.npcName,
              icon: kill.heroNpc.npcIcon,
            }}
          />
        ) : (
          <Skull className="size-4 text-muted-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <TextLink
          aria-label={detailLabel}
          title={detailLabel}
          className="inline-flex max-w-full min-w-0 items-center text-sm"
          render=<Link
            to="/$guildId/events/$eventId/heroes/$heroId/kills/$killId"
            params={{
              guildId,
              eventId,
              heroId: kill.heroNpcId,
              killId: kill.id,
            }}
          />
        >
          <span className="truncate font-semibold">{kill.heroNpc.npcName}</span>
        </TextLink>
        <div
          className={cn(
            "mt-0.5 truncate text-[10px] text-muted-foreground tabular-nums",
            !alwaysShowsDate && "sm:hidden",
          )}
        >
          {timestampToDate(kill.killedAt)}
        </div>
      </div>
    </div>
  );
};
