import { useTranslation } from "react-i18next";
import { Card } from "@lootlog/ui/components/card";
import { Package, Frown } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  useEventHeroLoots,
  type EventLoot,
} from "../hooks/use-event-hero-loots";
import { MARGONEM_CDN_ITEMS_URL, MARGONEM_CDN_NPCS_URL } from "@/constants/margonem";
import { cn } from "@/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";

interface EventHeroLootsProps {
  guildId: string;
  eventId: string;
  world: string;
  limit?: number;
}

const RARITY_COLORS: Record<string, string> = {
  LEGENDARY: "border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.3)]",
  HEROIC: "border-purple-500/60",
  UNIQUE: "border-yellow-500/60",
  UPGRADED: "border-green-500/60",
};

const LootItemTile = ({ item }: { item: EventLoot["items"][number] }) => {
  const rarityClass = item.rarity ? RARITY_COLORS[item.rarity] : "";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "w-8 h-8 rounded border border-border/50 overflow-hidden cursor-pointer hover:scale-110 transition-transform",
            rarityClass,
          )}
        >
          {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
          <img
            src={`${MARGONEM_CDN_ITEMS_URL}${item.icon}`}
            alt={item.name}
            className="w-full h-full object-contain"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{item.name}</p>
        {item.lvl && <p className="text-xs text-muted-foreground">Lvl: {item.lvl}</p>}
      </TooltipContent>
    </Tooltip>
  );
};

const LootNpcTile = ({ npc }: { npc: EventLoot["npcs"][number] }) => (
  <div className="flex items-center gap-2">
    {npc.icon && (
      <div className="w-6 h-6 rounded overflow-hidden">
        {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
        <img
          src={`${MARGONEM_CDN_NPCS_URL}${npc.icon}`}
          alt={npc.name}
          className="w-full h-full object-contain"
        />
      </div>
    )}
    <span className="text-sm font-medium truncate">{npc.name}</span>
  </div>
);

const LootCard = ({ loot }: { loot: EventLoot }) => {
  const hasLegendary = loot.items.some((item) => item.rarity === "LEGENDARY");

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card/50 transition-colors",
        hasLegendary &&
          "border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {loot.npcs[0] && <LootNpcTile npc={loot.npcs[0]} />}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {format(new Date(loot.createdAt), "d MMM HH:mm", { locale: pl })}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {loot.items.slice(0, 6).map((item, idx) => (
          <LootItemTile key={`${item.hid}-${idx}`} item={item} />
        ))}
        {loot.items.length > 6 && (
          <div className="w-8 h-8 rounded border border-border/50 flex items-center justify-center text-xs text-muted-foreground">
            +{loot.items.length - 6}
          </div>
        )}
      </div>
      {loot.member && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            {loot.member.name}
          </span>
        </div>
      )}
    </div>
  );
};

export const EventHeroLoots = ({
  guildId,
  eventId,
  world,
  limit = 10,
}: EventHeroLootsProps) => {
  const { t } = useTranslation();
  const { data: loots, isLoading } = useEventHeroLoots({
    guildId,
    eventId,
    world,
    limit,
  });

  if (isLoading) {
    return (
      <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          {t("events.loots.title")}
        </h2>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Package className="w-5 h-5" />
        {t("events.loots.title")}
      </h2>
      {!loots || loots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Frown className="w-8 h-8 mb-2" />
          <p className="text-sm">{t("events.loots.noLoots")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {loots.map((loot) => (
            <LootCard key={loot.id} loot={loot} />
          ))}
        </div>
      )}
    </Card>
  );
};
