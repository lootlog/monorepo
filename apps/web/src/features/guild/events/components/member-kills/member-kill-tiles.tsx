import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type { KillHistoryMemberEntry } from "@lootlog/client/main";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { KillMonsterCell } from "../kills/kill-monster-cell";
import { MemberKillBreakdown } from "./member-kill-breakdown";
import { MemberKillBreakdownToggle } from "./member-kill-breakdown-toggle";
import { MemberKillPoints } from "./member-kill-points";
import { getMemberKillScoringViewModel } from "./member-kills-view-model";

type MemberKillTilesProps = {
  kills: KillHistoryMemberEntry[];
  guildId: string;
  eventId: string;
  expandedKillIds: readonly string[];
  onExpandedToggle: (killId: string) => void;
};

/** The member's kills on phones, where the table's columns don't fit: one tile per kill. */
export const MemberKillTiles = ({
  kills,
  guildId,
  eventId,
  expandedKillIds,
  onExpandedToggle,
}: MemberKillTilesProps) => {
  const { t } = useTranslation();

  return (
    <ul>
      {kills.map((kill) => {
        const isExpanded = expandedKillIds.includes(kill.id);

        const { trackingPercentage, trackingTime } =
          getMemberKillScoringViewModel(kill, t);

        return (
          <li
            key={kill.id}
            data-list-tile
            className={cn(LIST_TILE_RULE_CLASS, isExpanded && "bg-primary/12")}
          >
            <div
              className={cn(
                "flex h-16 items-center gap-3",
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
                <MemberKillPoints kill={kill} />
                <span
                  title={`${t("events.kills.timeCoverage")} · ${t("events.kills.trackingDurationTime")}`}
                  className="text-xs text-muted-foreground tabular-nums"
                >
                  {trackingPercentage} · {trackingTime}
                </span>
              </div>
              <MemberKillBreakdownToggle
                monsterName={kill.heroNpc.npcName}
                isExpanded={isExpanded}
                onToggle={() => onExpandedToggle(kill.id)}
              />
            </div>
            {isExpanded && (
              <div className={cn("pb-3", LIST_TILE_INSET_CLASS)}>
                <MemberKillBreakdown kill={kill} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};
