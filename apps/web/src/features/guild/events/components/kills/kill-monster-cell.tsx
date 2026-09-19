import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Skull } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NpcTile } from "@/components/tiles";
import type { HeroKillHeroNpc } from "../../hooks/queries/use-hero-kill-history";
import { formatDateTime } from "../../utils/format-date";

type KillMonsterCellProps = {
  eventId: string;
  guildId: string;
  /** Keeps the kill date under the name when the table has no date column. */
  isDateAlwaysVisible?: boolean;
  kill: {
    heroNpc: Pick<HeroKillHeroNpc, "npcIcon" | "npcId" | "npcName">;
    heroNpcId: string;
    id: string;
    killedAt: string;
  };
};

export const KillMonsterCell = ({
  eventId,
  guildId,
  isDateAlwaysVisible = false,
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
          className="hidden shrink-0 lg:block"
          npc={{
            id: kill.heroNpc.npcId ?? undefined,
            name: kill.heroNpc.npcName,
            icon: kill.heroNpc.npcIcon,
          }}
        />
      ) : (
        <Skull className="hidden size-4 shrink-0 text-muted-foreground lg:block" />
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
            !isDateAlwaysVisible && "sm:hidden",
          )}
        >
          {formatDateTime(new Date(kill.killedAt))}
        </div>
      </div>
    </div>
  );
};
