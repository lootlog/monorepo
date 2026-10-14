import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type { KillHistoryEntry } from "@lootlog/client/main";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { KillMonsterCell } from "./kill-monster-cell";
import { KillRespawnTime } from "./kill-respawn-time";

type EventKillTilesProps = {
  kills: KillHistoryEntry[];
  guildId: string;
  eventId: string;
};

/** The kill history on phones, where the table's columns don't fit: one tile per kill. */
export const EventKillTiles = ({
  kills,
  guildId,
  eventId,
}: EventKillTilesProps) => {
  const { t } = useTranslation();

  return (
    <ul>
      {kills.map((kill) => (
        <li
          key={kill.id}
          data-list-tile
          className={cn(
            "flex h-16 items-center gap-3",
            LIST_TILE_RULE_CLASS,
            LIST_TILE_INSET_CLASS,
          )}
        >
          <span
            title={t("events.kills.killNumber")}
            className="w-6 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums"
          >
            {kill.killNumber}
          </span>
          <div className="min-w-0 flex-1">
            <KillMonsterCell
              eventId={eventId}
              guildId={guildId}
              kill={kill}
              alwaysShowsDate
            />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5 text-sm">
            <div title={t("events.kills.respawnTime")}>
              <KillRespawnTime kill={kill} />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("events.kills.participantCount", {
                count: kill.participantCount,
              })}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
};
