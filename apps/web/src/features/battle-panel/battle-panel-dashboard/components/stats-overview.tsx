import { Swords, Trophy, Award, ChevronRight } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import { useState, useEffect } from "react";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { useBattleAnalytics } from "@/hooks/api/battle-log/use-battle-analytics";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Separator } from "@lootlog/ui/components/separator";
import CountUp from "@lootlog/ui/components/count-up";
import { ROUTES } from "@/config/routes";
import { Link } from "@tanstack/react-router";
import {
  useBattleFiltersStore,
  type Period,
} from "@/store/battle-filters.store";
import {
  CharacterSelector,
  PeriodSelector,
  LevelRangeFilter,
} from "@/components/filters";

interface Stat {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  useSeparator?: boolean;
  suffix?: string;
  decimals?: number;
  gradientType?: "winRatio" | "ph";
}

const getGradientColor = (value: number, type: "winRatio" | "ph"): string => {
  if (type === "winRatio") {
    const normalized = Math.max(0, Math.min(100, value)) / 100;
    if (normalized < 0.5) {
      const t = normalized * 2;
      return `oklch(${65 + t * 15}% ${0.2 - t * 0.1} ${0 + t * 120})`;
    } else {
      const t = (normalized - 0.5) * 2;
      return `oklch(${80 + t * 10}% ${0.1 + t * 0.1} ${120 + t * 20})`;
    }
  } else {
    const normalized = Math.max(-100, Math.min(100, value));
    if (normalized < 0) {
      const t = Math.abs(normalized) / 100;
      return `oklch(${75 - t * 15}% ${0.15 + t * 0.05} ${0})`;
    } else {
      const t = normalized / 100;
      return `oklch(${75 + t * 15}% ${0.15 + t * 0.05} ${140})`;
    }
  }
};

type DashboardPeriod = Exclude<Period, "all">;

export function StatsOverview() {
  const currentCharacterId = useBattleFiltersStore(
    (state) => state.currentCharacterId,
  );
  const setCurrentCharacterId = useBattleFiltersStore(
    (state) => state.setCurrentCharacterId,
  );
  const updateFilters = useBattleFiltersStore((state) => state.updateFilters);

  const filters = useBattleFiltersStore((state) =>
    state.getFilters(state.currentCharacterId),
  );

  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>(
    (filters.period === "all" ? "30d" : filters.period) || "30d",
  );

  const minLevel = filters.minLevel ?? 1;
  const maxLevel = filters.maxLevel ?? 500;

  const { data: characters = [], isLoading: isLoadingCharacters } =
    useBattleCharacters();

  useEffect(() => {
    setSelectedPeriod(
      (filters.period === "all" ? "30d" : filters.period) || "30d",
    );
  }, [currentCharacterId, filters.period]);

  const { data: analytics, isLoading: isLoadingAnalytics } = useBattleAnalytics(
    {
      characterId: currentCharacterId,
      period: selectedPeriod,
      minLevel,
      maxLevel,
    },
  );

  const handlePeriodChange = (period: Period) => {
    const dashboardPeriod =
      period === "all" ? "30d" : (period as DashboardPeriod);
    setSelectedPeriod(dashboardPeriod);
    updateFilters(currentCharacterId, { period: dashboardPeriod });
  };

  const selectedCharacter = characters.find(
    (char) => char.id === currentCharacterId,
  );

  const stats: Stat[] = [
    {
      title: "Łączne walki",
      value: analytics?.totalBattles ?? 0,
      icon: Swords,
      description: selectedCharacter
        ? `${selectedCharacter.name} (${selectedCharacter.world})`
        : "wszystkie postacie",
      useSeparator: true,
    },
    {
      title: "Współczynnik wygranych",
      value: analytics?.winRatio ?? 0,
      icon: Trophy,
      description: analytics
        ? `${analytics.wins}W / ${analytics.losses}L`
        : "0W / 0L",
      suffix: "%",
      decimals: 1,
      gradientType: "winRatio",
    },
    {
      title: "Zdobyte punkty honoru",
      value: analytics?.totalPH ?? 0,
      icon: Award,
      description: selectedCharacter
        ? `${selectedCharacter.name}`
        : "wszystkie postacie",
      useSeparator: true,
      gradientType: "ph",
    },
  ];

  if (isLoadingCharacters) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="p-4 bg-background">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-semibold">Przegląd statystyk</h2>
            <p className="text-muted-foreground text-sm">
              Statystyki walk dla wybranego okresu
            </p>
          </div>

          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.user.battlePanel.statistics}>
              Zobacz szczegółowe statystyki
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
      <Separator />
      <div className="p-4 space-y-4">
        {isLoadingAnalytics ? (
          <div className="flex items-center justify-center p-8">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const color = stat.gradientType
                ? getGradientColor(stat.value, stat.gradientType)
                : undefined;
              return (
                <div key={index} className="relative overflow-hidden">
                  <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </div>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div
                      className="text-2xl font-bold"
                      style={color ? { color } : undefined}
                    >
                      <CountUp
                        to={
                          stat.decimals
                            ? Number(stat.value.toFixed(stat.decimals))
                            : stat.value
                        }
                        separator={stat.useSeparator ? " " : ""}
                        className="inline"
                        duration={0.8}
                      />
                      {stat.suffix && (
                        <span className="ml-0.5">{stat.suffix}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{stat.description}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Separator />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-col md:flex-row md:items-end gap-3 w-full md:w-auto">
            <div className="space-y-1 w-full md:w-auto">
              <Label className="text-xs invisible">Postać</Label>
              <CharacterSelector
                characterId={currentCharacterId}
                onCharacterChange={setCurrentCharacterId}
                allowAllCharacters
                className="w-full md:w-[250px] h-10"
              />
            </div>

            <div className="space-y-1 w-full md:w-auto">
              <Label className="text-xs invisible">Okres</Label>
              <PeriodSelector
                value={selectedPeriod}
                onValueChange={handlePeriodChange}
                excludePeriods={["all"]}
                width="w-full md:w-[220px]"
              />
            </div>

            <div className="flex items-end gap-3">
              <LevelRangeFilter
                minLevel={minLevel}
                maxLevel={maxLevel}
                onMinLevelChange={(value) =>
                  updateFilters(currentCharacterId, { minLevel: value ?? 1 })
                }
                onMaxLevelChange={(value) =>
                  updateFilters(currentCharacterId, { maxLevel: value ?? 500 })
                }
                minLevelId="min-level-overview"
                maxLevelId="max-level-overview"
                inputClassName="w-full md:w-[140px]"
                containerClassName="flex-1 md:flex-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
