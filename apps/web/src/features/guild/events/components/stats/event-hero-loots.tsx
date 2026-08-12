import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Tabs, TabsTrigger } from "@lootlog/ui/components/tabs";
import { Package, Frown, ChevronRight } from "lucide-react";
import { useEventLoots } from "../../hooks/queries/use-event-loots";
import type { EventHeroNpc } from "../../types/api";
import { LootsListItem } from "@/features/guild/loots-list/components/loots-list/loots-list-item";
import { LootDetailsDialog } from "@/features/guild/loots-list/components/loots-list/loot-details-dialog";
import { EventScrollableTabsList } from "../shared/event-scrollable-tabs-list";
import { Spinner } from "@lootlog/ui/components/spinner";

interface EventHeroLootsProps {
  guildId: string;
  heroNpcNames: string[];
  heroNpcs?: EventHeroNpc[];
  showHeroTabs?: boolean;
  world: string;
  limit?: number;
}

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

  return (
    <>
      <Card className="gap-0 overflow-hidden border-border bg-card p-0">
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-border/70 px-3 py-2">
          <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <Package className="size-4 shrink-0 text-primary" />
            <span className="truncate">{t("events.loots.title")}</span>
          </h2>
          <Link
            to="/$guildId"
            params={{ guildId }}
            search={{
              npcs: activeHeroName ?? heroNpcNames.join(","),
            }}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-sm text-xs font-semibold text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {t("events.loots.showAll")}
            <ChevronRight className="size-3.5" />
          </Link>
        </header>

        {showHeroTabs && heroNpcs && heroNpcs.length > 1 && (
          <Tabs
            value={activeHeroName ?? heroNpcs[0]?.npcName}
            onValueChange={setSelectedHeroName}
            className="border-b border-border/70 px-3 py-2"
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

        {isLoading ? (
          <div className="flex min-h-32 items-center justify-center">
            <Spinner className="size-6" />
          </div>
        ) : !loots || loots.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center py-6 text-muted-foreground">
            <Frown className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">{t("events.loots.noLoots")}</p>
          </div>
        ) : (
          <div
            key={activeHeroName}
            className="divide-y divide-border/70 animate-in fade-in-0 duration-200"
          >
            {loots.map((loot) => (
              <LootsListItem key={loot.id} loot={loot} variant="embedded" />
            ))}
          </div>
        )}
      </Card>
      <LootDetailsDialog />
    </>
  );
};
