import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import {
  Package,
  Frown,
  ChevronRight,
  Calendar,
  MapPin,
  Users,
} from "lucide-react";
import { useEventLoots } from "../../hooks/queries/use-event-loots";
import type { EventHeroNpc } from "../../hooks/queries/use-events";
import { ItemTile } from "@/components/tiles";
import { LootNpcs } from "@/features/guild/components/loots-list/loot-npcs";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { cn } from "@/utils/cn";
import { ItemRarity, type Loot } from "@/hooks/api/loots/use-loots";
import { EventScrollableTabsList } from "../shared/event-scrollable-tabs-list";

interface EventHeroLootsProps {
  guildId: string;
  heroNpcNames: string[];
  heroNpcs?: EventHeroNpc[];
  showHeroTabs?: boolean;
  world: string;
  limit?: number;
}

const LEGENDARY_GRADIENT =
  "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(0,0,0,0) 50%, rgba(239,68,68,0.05) 100%)";

const LootItemsRow = ({ loot }: { loot: Loot }) => {
  const hasLegendaryItem = loot.items.some(
    (item) => item.rarity === ItemRarity.LEGENDARY,
  );
  const date = timestampToDate(loot.createdAt);

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border bg-card/30",
        hasLegendaryItem &&
          "border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
      )}
      style={hasLegendaryItem ? { background: LEGENDARY_GRADIENT } : undefined}
    >
      <div className="mb-2">
        <LootNpcs npcs={loot.npcs} />
      </div>

      <div className="flex flex-row flex-wrap gap-1 py-2 border-t border-border/30">
        {loot.items.map((item, idx) => (
          <ItemTile key={`${item.hid}-${idx}`} item={item} />
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-border/30 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {loot.location}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {date}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground sm:self-auto">
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

export const EventHeroLoots = ({
  guildId,
  heroNpcNames,
  heroNpcs,
  showHeroTabs,
  world,
  limit = 10,
}: EventHeroLootsProps) => {
  const { t } = useTranslation();
  const [selectedHeroName, setSelectedHeroName] = useState<string | null>(null);

  const activeHeroName = selectedHeroName ?? heroNpcs?.[0]?.npcName ?? null;

  const npcNamesToFetch =
    showHeroTabs && heroNpcs && heroNpcs.length > 1 && activeHeroName
      ? [activeHeroName]
      : heroNpcNames;

  const { data: loots, isLoading } = useEventLoots({
    guildId,
    npcNames: npcNamesToFetch,
    world,
    limit,
  });

  if (isLoading) {
    return (
      <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          {t("events.loots.title")}
        </h2>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 bg-card/40 backdrop-blur-sm border-border gap-2">
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
        <Package className="w-4 h-4" />
        {t("events.loots.title")}
      </h2>

      {showHeroTabs && heroNpcs && heroNpcs.length > 1 && (
        <Tabs
          value={activeHeroName ?? heroNpcs[0]?.npcName}
          onValueChange={setSelectedHeroName}
          className="mb-3"
        >
          <EventScrollableTabsList>
            {heroNpcs.map((hero) => (
              <TabsTrigger
                key={hero.id}
                value={hero.npcName}
                className="flex-shrink-0 text-xs"
              >
                {hero.npcName}
              </TabsTrigger>
            ))}
          </EventScrollableTabsList>
        </Tabs>
      )}

      {!loots || loots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <Frown className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">{t("events.loots.noLoots")}</p>
        </div>
      ) : (
        <>
          <div
            key={activeHeroName}
            className="space-y-2 animate-in fade-in-0 duration-200"
          >
            {loots.map((loot) => (
              <LootItemsRow key={loot.id} loot={loot} />
            ))}
          </div>
          <Link
            to="/$guildId"
            params={{ guildId }}
            search={{
              npcs: activeHeroName ? activeHeroName : heroNpcNames.join(","),
            }}
            className="block mt-3"
          >
            <Button variant="outline" className="w-full" size="sm">
              {t("events.loots.showAll")}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </>
      )}
    </Card>
  );
};
