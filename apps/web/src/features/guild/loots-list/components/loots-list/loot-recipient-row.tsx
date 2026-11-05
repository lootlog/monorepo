import { PlayerTile } from "@/components/tiles/player-tile";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { cn } from "cn";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Item } from "@/lib/loots/loot-types";
import type { LootRosterPlayer } from "./build-loot-roster";
import { formatRosterPlayerDetail } from "./format-roster-player-detail";
import { groupIdenticalItems } from "./group-identical-items";
import { LootItemLine } from "./loot-item-line";

/**
 * A player beside what they received, each item named with its identifier.
 * Narrower than 20rem, the items move under the player.
 */
export const LootRecipientRow = ({
  player,
  watchContext,
  onShowLoots,
  muted = false,
  renderItemAction,
}: {
  player: LootRosterPlayer;
  watchContext: WatchedItemScope;
  onShowLoots?: () => void;
  muted?: boolean;
  renderItemAction?: (item: Item) => ReactNode;
}) => {
  const { t } = useTranslation();
  const detail = formatRosterPlayerDetail(t, player);

  return (
    <li className={cn("@container", muted && "opacity-70")}>
      <div
        className={cn(
          "grid grid-cols-1 items-center gap-x-3 gap-y-2 py-2.5 @xs:grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] @md:gap-x-4 @md:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)]",
          LIST_TILE_INSET_CLASS,
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <PlayerTile
            player={player}
            accountId={player.accountId ?? undefined}
            characterId={player.characterId ?? undefined}
            world={watchContext.world}
            onShowLoots={onShowLoots}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-tight">
              {player.name}
            </p>
            {detail && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {detail}
              </p>
            )}
          </div>
        </div>
        {player.items.length > 0 && (
          <div className="flex min-w-0 flex-col gap-2 @max-xs:pl-11">
            {groupIdenticalItems(player.items).map((entry) => (
              <LootItemLine
                key={entry.item.hid}
                entry={entry}
                watchContext={watchContext}
                action={renderItemAction?.(entry.item)}
              />
            ))}
          </div>
        )}
      </div>
    </li>
  );
};
