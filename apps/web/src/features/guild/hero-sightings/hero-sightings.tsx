import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { AlertCircle, Plus, Radar, SearchX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/common/empty-state";
import { ResultsSurface } from "@/components/common/results-surface";
import { GuildWorldHeaderSwitcher } from "@/components/layout/guild-world-header-switcher";
import { HeaderSlotPortal } from "@/components/layout/header-slot-portal";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { KillStatsSearch } from "@/features/kills/components/kill-stats-search";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";
import {
  HeroSightingHistoryDialog,
  type HeroSightingHistoryTarget,
} from "./hero-sighting-history-dialog";
import { HeroSightingAddDialog } from "./hero-sighting-add-dialog";
import { sortHeroSightings } from "./hero-sighting-status";
import { canClaimHeroSightings } from "@/lib/hero-sightings-permissions";
import { collectKnownHeroes } from "@lootlog/domain/hero-sightings";
import { HeroSightingsBoard } from "./hero-sightings-board";
import { HeroSightingsResultsSkeleton } from "./hero-sightings-results-skeleton";
import { useGuildHeroSightings } from "./use-guild-hero-sightings";
import { useGuildHeroTimers } from "./use-guild-hero-timers";
import { useGuildTimers } from "@/features/guild/timers/use-guild-timers";
import { useTimerDisplaySettings } from "@/features/guild/timers/use-timer-display-settings";
import { RetryButton } from "@/components/common/retry-button";

/**
 * The latest sighting of each hero that members found with the in-game hero
 * detector, or added by hand: where it roams or will spawn, who found it, and
 * who camps it.
 */
export const HeroSightings = () => {
  const { t } = useTranslation();
  const now = useMinuteTimestamp();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { data: accessPolicy } = useGuildPermissions();
  const canAdd = canClaimHeroSightings(accessPolicy);

  const [historyTarget, setHistoryTarget] =
    useState<HeroSightingHistoryTarget | null>(null);

  const { world, sightings, isPending, isError, isFetching, refetch } =
    useGuildHeroSightings();

  // Each hero reads against its respawn timer, counted as on the timers page.
  const { removeTimerAfterMs, countdownMode } = useTimerDisplaySettings();
  const { timers } = useGuildTimers(removeTimerAfterMs);
  const heroTimers = useGuildHeroTimers();

  const normalizedSearch = search.trim().toLowerCase();

  const visible = sortHeroSightings(
    (sightings ?? []).filter((sighting) =>
      sighting.hero.name.toLowerCase().includes(normalizedSearch),
    ),
    now,
  );

  const openHistory = (sighting: HeroSightingResponseDto) =>
    setHistoryTarget({ world: sighting.world, hero: sighting.hero });

  const retryButton = (
    <RetryButton onRetry={() => refetch()} isRetrying={isFetching} />
  );

  const renderResults = () => {
    if (isError && sightings === undefined) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={AlertCircle}
            title={t("heroSightings.loadError")}
            action={retryButton}
          />
        </div>
      );
    }

    if (isPending) return <HeroSightingsResultsSkeleton />;

    if (visible.length === 0) {
      return (
        <div className="p-3">
          {normalizedSearch ? (
            <EmptyState
              fill
              icon={SearchX}
              title={t("heroSightings.noResults")}
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSearch("")}
                >
                  {t("heroSightings.clearSearch")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              fill
              icon={Radar}
              title={t("heroSightings.empty")}
              description={t("heroSightings.emptyDescription")}
              action={
                canAdd ? (
                  <Button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    icon=<Plus className="size-4" />
                  >
                    {t("heroSightings.add.open")}
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      );
    }

    return (
      <HeroSightingsBoard
        sightings={visible}
        timers={timers}
        heroTimers={heroTimers}
        now={now}
        countdownMode={countdownMode}
        removeTimerAfterMs={removeTimerAfterMs}
        showWorld={world === null}
        onOpenHistory={openHistory}
      />
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">{t("heroSightings.title")}</h1>
      <GuildWorldHeaderSwitcher />
      {canAdd && (
        <HeaderSlotPortal slot="actions">
          {isMobile ? (
            // Phones keep the bar to icons; the prominent action is round.
            <Button
              type="button"
              size="icon-lg"
              className="rounded-full"
              aria-label={t("heroSightings.add.open")}
              onClick={() => setIsAdding(true)}
            >
              <Plus />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setIsAdding(true)}
              icon=<Plus className="size-4" />
            >
              {t("heroSightings.add.open")}
            </Button>
          )}
        </HeaderSlotPortal>
      )}
      {isError && sightings !== undefined && (
        <Alert
          variant="destructive"
          className="m-3 flex w-auto flex-wrap items-center justify-between gap-3"
        >
          <AlertDescription>{t("heroSightings.refreshError")}</AlertDescription>
          {retryButton}
        </Alert>
      )}
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <ResultsSurface
          search={
            <KillStatsSearch
              value={search}
              placeholder={t("heroSightings.searchPlaceholder")}
              onChange={setSearch}
            />
          }
          filtersLabel={t("heroSightings.filtersLabel")}
        >
          {renderResults()}
        </ResultsSurface>
      </ScrollArea>
      <HeroSightingHistoryDialog
        target={historyTarget}
        onClose={() => setHistoryTarget(null)}
      />
      {canAdd && (
        <HeroSightingAddDialog
          open={isAdding}
          onOpenChange={setIsAdding}
          knownHeroes={collectKnownHeroes(sightings ?? [], heroTimers)}
        />
      )}
    </div>
  );
};
