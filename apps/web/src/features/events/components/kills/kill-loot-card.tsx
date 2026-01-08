import { MapPin, Calendar, Users, Package } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@/utils/cn";
import {
  MARGONEM_CDN_ITEMS_URL,
  MARGONEM_CDN_CHARACTERS_URL,
  MARGONEM_CDN_NPCS_URL,
} from "@/constants/margonem";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { ItemRarity, type Loot } from "@/hooks/api/loots/use-loots";

const LEGENDARY_GRADIENT =
  "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(0,0,0,0) 50%, rgba(239,68,68,0.05) 100%)";

interface KillLootCardProps {
  loot: Loot;
}

export const KillLootCard = ({ loot }: KillLootCardProps) => {
  const date = timestampToDate(loot.createdAt);
  const hasLegendaryItem = loot.items.some(
    (item) => item.rarity === ItemRarity.LEGENDARY,
  );

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border/50 bg-card/30",
        hasLegendaryItem &&
          "border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
      )}
      style={hasLegendaryItem ? { background: LEGENDARY_GRADIENT } : undefined}
    >
      <div className="flex items-center gap-2 mb-2">
        {loot.npcs.slice(0, 3).map((npc) => (
          <div key={npc.id} className="flex items-center gap-1.5">
            {npc.icon && (
              <img
                src={`${MARGONEM_CDN_NPCS_URL}/${npc.icon}`}
                alt={npc.name}
                className="w-6 h-6 object-contain"
              />
            )}
            <span className="text-sm font-medium">{npc.name}</span>
          </div>
        ))}
        {loot.npcs.length > 3 && (
          <span className="text-xs text-muted-foreground">
            +{loot.npcs.length - 3}
          </span>
        )}
      </div>

      <div className="flex flex-row items-start gap-2 flex-wrap py-2 border-t border-border/30">
        {loot.players.slice(0, 6).map((player) => (
          <div key={player.id} className="flex items-center gap-1">
            {player.icon && (
              <img
                src={`${MARGONEM_CDN_CHARACTERS_URL}/${player.icon}`}
                alt={player.name}
                className="w-5 h-8 object-contain"
              />
            )}
            <span className="text-xs">{player.name}</span>
          </div>
        ))}
        {loot.players.length > 6 && (
          <span className="text-xs text-muted-foreground self-center">
            +{loot.players.length - 6}
          </span>
        )}
      </div>

      {loot.items.length > 0 && (
        <div className="flex flex-row flex-wrap gap-1 py-2 border-t border-border/30">
          {loot.items.slice(0, 8).map((item, idx) => (
            <Tooltip key={`${item.hid}-${idx}`}>
              <TooltipTrigger asChild>
                <img
                  src={`${MARGONEM_CDN_ITEMS_URL}/${item.icon}`}
                  alt={item.name}
                  className={cn(
                    "w-8 h-8 object-contain cursor-pointer",
                    item.rarity === ItemRarity.LEGENDARY &&
                      "ring-1 ring-red-500 rounded",
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{item.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {loot.items.length > 8 && (
            <span className="text-xs text-muted-foreground self-center">
              +{loot.items.length - 8}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {loot.location}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {date}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {loot.players.length}
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {loot.items.length}
          </span>
        </div>
      </div>
    </div>
  );
};
