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

type Props = {
  loot: Loot;
};

export const LootsListItem: React.FC<Props> = ({ loot }) => {
  const date = timestampToDate(loot.createdAt);
  const sortedNpcs = loot.npcs.sort((a, b) => b.wt - a.wt);

  return (
    <li className="py-2 hover:bg-accent group hover:cursor-pointer">
      <Card className="rounded-none border-none group-hover:bg-accent group-hover:cursor-pointer">
        <CardHeader className="space-y-0 px-4 py-1 flex-wrap flex-col">
          <div className="w-full ">
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
              return <ItemTile key={item.hid} item={item} />;
            })}
          </div>
          <div className="flex flex-row gap-2 flex-wrap">
            {loot.players.map((player) => {
              return <PlayerTile key={player.id} player={player} />;
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
