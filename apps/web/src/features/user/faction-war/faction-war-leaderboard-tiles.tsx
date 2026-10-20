import { Fragment } from "react";
import { cn } from "cn";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { RankBadge } from "@/components/common/rank-badge";
import { hasFactionWarLeaderboardGapAfter } from "./faction-war-leaderboard-gap";
import { FactionWarPlayerName } from "./faction-war-player-name";
import type { FactionWarLeaderboardEntry } from "./faction-war-queries";
import { formatFactionWarPoints } from "./format-faction-war-number";

type FactionWarLeaderboardTilesProps = {
  entries: readonly FactionWarLeaderboardEntry[];
};

/** The leaderboard where the table's columns don't fit: one tile per player. */
export const FactionWarLeaderboardTiles = ({
  entries,
}: FactionWarLeaderboardTilesProps) => (
  <ol>
    {entries.map((entry, index) => (
      <Fragment key={entry.rank}>
        <li
          aria-current={entry.isMe || undefined}
          data-list-tile
          className={cn(
            "flex min-h-14 items-center gap-3 py-2",
            LIST_TILE_RULE_CLASS,
            LIST_TILE_INSET_CLASS,
            entry.isMe && "bg-primary/10",
          )}
        >
          <RankBadge rank={entry.rank} />
          <span className="min-w-0 flex-1">
            <FactionWarPlayerName entry={entry} className="text-sm" />
            {entry.world && (
              <span className="block truncate text-xs text-muted-foreground capitalize">
                {entry.world}
              </span>
            )}
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {formatFactionWarPoints(entry.points)}
          </span>
        </li>
        {hasFactionWarLeaderboardGapAfter(entries, index) && (
          <li
            aria-hidden="true"
            className={cn(
              "flex h-6 items-center text-xs text-muted-foreground",
              LIST_TILE_RULE_CLASS,
              LIST_TILE_INSET_CLASS,
            )}
          >
            ⋯
          </li>
        )}
      </Fragment>
    ))}
  </ol>
);
