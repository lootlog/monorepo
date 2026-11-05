import { PlayerTile } from "@/components/tiles/player-tile";
import { WatchableItemTile } from "@/components/tiles/watchable-item-tile";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { LootRosterPlayer } from "./build-loot-roster";
import { formatRosterPlayerDetail } from "./format-roster-player-detail";

export const LootRosterRow = ({
  player,
  watchContext,
  onShowLoots,
  muted = false,
}: {
  player: LootRosterPlayer;
  watchContext: WatchedItemScope;
  onShowLoots?: () => void;
  muted?: boolean;
}) => {
  const { t } = useTranslation();

  const detail = formatRosterPlayerDetail(t, player);

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 py-2 @xs:flex-nowrap",
        LIST_TILE_INSET_CLASS,
        muted && "opacity-70",
      )}
    >
      <PlayerTile
        player={player}
        accountId={player.accountId ?? undefined}
        characterId={player.characterId ?? undefined}
        world={watchContext.world}
        onShowLoots={onShowLoots}
      />
      <div className="min-w-0 flex-1 basis-32">
        <p className="min-w-0 break-words text-sm font-medium leading-tight">
          {player.name}
        </p>
        {detail && (
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        )}
      </div>
      {player.items.length > 0 && (
        <div className="flex basis-full flex-wrap gap-1.5 @xs:ml-auto @xs:basis-auto @xs:justify-end">
          {player.items.map((item, index) => (
            <WatchableItemTile
              key={`${item.hid}:${index}`}
              item={item}
              watchContext={watchContext}
            />
          ))}
        </div>
      )}
    </li>
  );
};
