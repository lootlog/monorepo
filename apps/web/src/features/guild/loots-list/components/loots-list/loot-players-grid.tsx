import { PlayerTile } from "@/components/tiles/player-tile";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { LootRosterPlayer } from "./build-loot-roster";
import { formatRosterPlayerDetail } from "./format-roster-player-detail";

/**
 * Players without items under a heading, packed tighter than the recipients:
 * party members who got nothing, or those on the map outside the party.
 */
export const LootPlayersGrid = ({
  title,
  players,
  watchContext,
  showLootsFor,
  muted = false,
}: {
  title: string;
  players: LootRosterPlayer[];
  watchContext: WatchedItemScope;
  showLootsFor: (playerName: string) => (() => void) | undefined;
  muted?: boolean;
}) => {
  const { t } = useTranslation();

  if (players.length === 0) return null;

  return (
    <div className="@container">
      <h3
        className={cn(
          "border-b border-border/70 bg-muted/20 py-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground",
          LIST_TILE_INSET_CLASS,
        )}
      >
        {title}
      </h3>
      <ul
        className={cn(
          "grid grid-cols-1 gap-x-4 gap-y-1 py-2 @xs:grid-cols-2 @2xl:grid-cols-3",
          LIST_TILE_INSET_CLASS,
        )}
      >
        {players.map((player) => (
          <li
            key={player.key}
            className={cn(
              "flex min-w-0 items-center gap-2.5 py-1",
              muted && "opacity-70",
            )}
          >
            <PlayerTile
              player={player}
              accountId={player.accountId ?? undefined}
              characterId={player.characterId ?? undefined}
              world={watchContext.world}
              onShowLoots={showLootsFor(player.name)}
            />
            <div className="min-w-0">
              <p className="truncate text-sm leading-tight">{player.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {formatRosterPlayerDetail(t, player)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
