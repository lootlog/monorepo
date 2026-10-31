import { CalendarX, Globe, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { Button } from "@lootlog/ui/components/button";
import { formatStatisticsDateHour } from "@/components/common/kill-analytics/format-statistics-date";
import {
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { MetaItem } from "@/components/common/meta-item";
import { getFactionWarFactionArt } from "./faction-war-art";
import type { FactionWarDisqualification } from "./faction-war-queries";

type FactionWarDisqualifiedTileProps = {
  warId: string;
  disqualification: FactionWarDisqualification;
  onRestore: (disqualification: FactionWarDisqualification) => void;
};

/** One excluded player: who, why and since when, with a way back. */
export const FactionWarDisqualifiedTile = ({
  warId,
  disqualification,
  onRestore,
}: FactionWarDisqualifiedTileProps) => {
  const { t } = useTranslation();

  const { characterName, faction, world, reason, disqualifiedAt } =
    disqualification;

  return (
    <li
      data-list-tile
      className={cn("flex items-center", LIST_TILE_RULE_CLASS)}
    >
      <div
        className={cn(
          "flex min-w-0 flex-1 items-start gap-3 py-3 pr-1 sm:pr-1",
          LIST_TILE_INSET_CLASS,
        )}
      >
        <img
          src={getFactionWarFactionArt(warId, faction).emblem}
          alt={t(`factionWar.factions.${faction}`)}
          width={256}
          height={256}
          decoding="async"
          className="size-9 shrink-0"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-semibold">
            {characterName}
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <MetaItem
              icon={Globe}
              label={t("factionWar.ranking.world")}
              className="capitalize"
            >
              {world}
            </MetaItem>
            <MetaItem
              icon={CalendarX}
              label={t("factionWar.moderation.disqualifiedAt")}
            >
              <time dateTime={disqualifiedAt}>
                {formatStatisticsDateHour(disqualifiedAt)}
              </time>
            </MetaItem>
          </span>
          <span
            className={cn(
              "text-sm break-words",
              reason ? "text-foreground" : "text-muted-foreground italic",
            )}
          >
            <span className="sr-only">
              {t("factionWar.moderation.reason")}:{" "}
            </span>
            {reason ?? t("factionWar.moderation.noReason")}
          </span>
        </span>
      </div>
      <div className={LIST_TILE_ACTIONS_CLASS}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon=<RotateCcw className="size-3.5" />
          aria-label={t("factionWar.moderation.restorePlayer", {
            name: characterName,
          })}
          onClick={() => onRestore(disqualification)}
        >
          {t("factionWar.moderation.restore")}
        </Button>
      </div>
    </li>
  );
};
