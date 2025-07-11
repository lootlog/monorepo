import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@lootlog/ui/components/card";
import { Loot } from "@/hooks/api/use-loots";
import { ItemTile } from "@/screens/guild/components/loots-list/item-tile";
import { PlayerTile } from "@/screens/guild/components/loots-list/player-tile";
import { cn } from "@/utils/cn";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { LOOT_SHARE_COLOR_PALETTE } from "@/screens/guild/constants/loot-share-color-palette";

type Props = {
  loot: Loot;
};

export const LootsListItem: React.FC<Props> = ({ loot }) => {
  const date = timestampToDate(loot.createdAt);
  const sortedNpcs = loot.npcs.sort((a, b) => b.wt - a.wt);

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
    <li className="py-2 hover:bg-[#181C25] group hover:cursor-pointer">
      <Card className="rounded-none border-none group-hover:bg-[#181C25] group-hover:cursor-pointer bg-transparent">
        <CardHeader className="space-y-0 px-4 py-1 flex-wrap flex-col">
          <div className="w-full">
            {sortedNpcs.map((npc, index) => {
              const isFirstElement = index === 0;
              const isLastElement = index === loot.npcs.length - 1;
              const className = cn("text-sm text-gray-500", {
                "text-white font-semibold": isFirstElement,
              });

              return (
                <span className={className} key={index}>
                  {npc.name}{" "}
                  {npc.lvl !== 0
                    ? `(${npc.lvl}${npc.prof?.charAt(0).toLowerCase() ?? ""})`
                    : ""}
                  {isLastElement ? "" : ","}&nbsp;
                </span>
              );
            })}
          </div>
          <span className="text-xs text-muted-foreground">{loot.location}</span>
        </CardHeader>
        <CardContent className="flex flex-row justify-between items-center flex-wrap px-4 py-0 gap-4">
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
        </CardContent>
        <CardFooter className="px-4 py-1">
          <span className="text-xs text-gray-500">Zdobyto {date}</span>
        </CardFooter>
      </Card>
    </li>
  );
};
