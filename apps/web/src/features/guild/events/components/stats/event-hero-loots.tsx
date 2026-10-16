import { EmptyState } from "@/components/common/empty-state";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { BandSection } from "@/components/common/band-section";
import { Package } from "lucide-react";
import { useEventLoots } from "../../hooks/queries/use-event-loots";
import type { EventHeroNpc } from "../../types/api";
import { LootsListItem } from "@/features/guild/loots-list/components/loots-list/loots-list-item";
import { LootDetailsDialog } from "@/features/guild/loots-list/components/loots-list/loot-details-dialog";
import { EmbeddedLootRowsSkeleton } from "../shared/embedded-loot-rows-skeleton";
import { HeroTabs } from "../shared/hero-tabs";

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

  const activeHeroName =
    showHeroTabs && heroNpcs && heroNpcs.length > 1 ? selectedHeroName : null;

  const npcNamesToFetch = activeHeroName ? [activeHeroName] : heroNpcNames;

  const { data: loots, isLoading } = useEventLoots({
    guildId,
    npcNames: npcNamesToFetch,
    world,
    limit,
  });

  return (
    <>
      <BandSection
        id="event-recent-loots"
        title={t("events.loots.title")}
        tiled
        trailing={
          <ChevronLink
            render=<Link
              to="/$guildId"
              params={{ guildId }}
              search={{
                npcs: activeHeroName ?? heroNpcNames.join(","),
              }}
            />
          >
            {t("events.loots.showAll")}
          </ChevronLink>
        }
      >
        {showHeroTabs && heroNpcs && (
          <HeroTabs
            placement="section"
            heroes={heroNpcs}
            valueKey="npcName"
            includeAll
            value={activeHeroName ?? undefined}
            onValueChange={(heroName) => setSelectedHeroName(heroName ?? null)}
          />
        )}

        {isLoading ? (
          <EmbeddedLootRowsSkeleton rows={Math.min(limit, 3)} />
        ) : !loots || loots.length === 0 ? (
          <EmptyState
            compact
            icon={Package}
            title={t("events.loots.noLoots")}
          />
        ) : (
          <div
            key={activeHeroName}
            className="divide-y divide-sidebar-border motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
          >
            {loots.map((loot) => (
              <LootsListItem key={loot.id} loot={loot} variant="embedded" />
            ))}
          </div>
        )}
      </BandSection>
      <LootDetailsDialog />
    </>
  );
};
