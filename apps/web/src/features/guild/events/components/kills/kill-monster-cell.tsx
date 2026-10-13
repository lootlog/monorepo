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
   * Sits in a preview card with no date column: the date stays under the name
   * and the sprite shows at every viewport width.
   */
  isPreview?: boolean;
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
  isPreview = false,
  kill,
}: KillMonsterCellProps) => {
  const { t } = useTranslation();

  const detailLabel = t("events.kills.openKillDetails", {
    monsterName: kill.heroNpc.npcName,
  });

  return (
    <div className="flex min-w-0 items-center gap-2">
      {kill.heroNpc.npcIcon ? (
        <NpcTile
          className={cn("shrink-0", !isPreview && "hidden lg:flex")}
          npc={{
            id: kill.heroNpc.npcId ?? undefined,
            name: kill.heroNpc.npcName,
            icon: kill.heroNpc.npcIcon,
          }}
        />
      ) : (
        <Skull
          className={cn(
            "size-4 shrink-0 text-muted-foreground",
            !isPreview && "hidden lg:block",
          )}
        />
      )}
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
            !isPreview && "sm:hidden",
          )}
        >
          {timestampToDate(kill.killedAt)}
        </div>
      </div>
    </div>
  );
};
