import { Loot } from "@/hooks/api/use-loots";
import { ItemTile } from "@/screens/guild/components/loots-list/item-tile";
import { PlayerTile } from "@/screens/guild/components/loots-list/player-tile";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { LOOT_SHARE_COLOR_PALETTE } from "@/screens/guild/constants/loot-share-color-palette";
import { Sheet, SheetTrigger } from "@lootlog/ui/components/sheet";
import { LootDetailsSheetContent } from "@/screens/guild/components/loots-list/loot-details-sheet-content";
import { LootNpcs } from "@/screens/guild/components/loots-list/loot-npcs";

type Props = {
  loot: Loot;
};

export const LootsListItem: React.FC<Props> = ({ loot }) => {
  const date = timestampToDate(loot.createdAt);

  const playerColorMap = loot.players.reduce<
    Record<string, { color: string; idx: number }>
  >((acc, player, idx) => {
    const color =
      LOOT_SHARE_COLOR_PALETTE[idx % LOOT_SHARE_COLOR_PALETTE.length] ?? "";
    acc[player.id] = { color, idx };

    return acc;
  }, {});

  const itemOwnerMap: Record<string, string | undefined> = {};
  Object.entries(loot.lootShare || {}).forEach(([playerId, itemIds]) => {
    itemIds.forEach((itemId) => {
      itemOwnerMap[itemId] = playerId;
    });
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <li className="py-2 hover:bg-[#181C25] group hover:cursor-pointer">
          <div className="px-4 py-1 flex flex-row justify-between">
            <div className="space-y-0 leading-none w-3/4">
              <LootNpcs npcs={loot.npcs} />
              <span className="text-xs text-muted-foreground">
                {loot.location}
              </span>
            </div>
            <div className="flex justify-start items-start gap-1 text-xs font-semibold">
              <span className="leading-none">Komentarze</span>
              <span className="leading-none">({loot.commentsCount})</span>
            </div>
          </div>
          <div className="flex flex-row justify-between items-center flex-wrap px-4 py-0 gap-4">
            <div className="flex flex-row gap-2 flex-wrap">
              {loot.items.map((item) => {
                const ownerId = itemOwnerMap[item.hid];
                const color = ownerId ? playerColorMap[ownerId] : undefined;
                return (
                  <ItemTile
                    key={item.hid}
                    item={item}
                    color={color?.color}
                    shareIndex={color?.idx}
                    shareNickname={
                      color ? loot.players[color.idx]?.name : undefined
                    }
                  />
                );
              })}
            </div>
            <div className="flex flex-row gap-2 flex-wrap">
              {loot.players.map((player, idx) => {
                const color = playerColorMap[player.id];
                return (
                  <PlayerTile
                    key={player.id}
                    player={player}
                    idx={idx}
                    color={color?.color}
                  />
                );
              })}
            </div>
          </div>
          <div className="px-4 pb-1 pt-2 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Zdobyto {date}
            </span>
          </div>
        </li>
      </SheetTrigger>
      <LootDetailsSheetContent
        loot={loot}
        ownerMap={itemOwnerMap}
        playerColorMap={playerColorMap}
      />
    </Sheet>
  );
};
