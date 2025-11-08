import {
  Swords,
  Trophy,
  User,
  Check,
  ChevronsUpDown,
  Calendar,
  Award,
  ChevronRight,
} from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lootlog/ui/components/command";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { cn } from "@lootlog/ui/lib/utils";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { useBattleAnalytics } from "@/hooks/api/battle-log/use-battle-analytics";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Separator } from "@lootlog/ui/components/separator";
import CountUp from "@lootlog/ui/components/count-up";
import { PlayerTile } from "@/components/battle";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { ROUTES } from "@/config/routes";
import { Link } from "@tanstack/react-router";
import { useBattleFiltersStore, type Period } from "@/store/battle-filters.store";

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

const periods: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "24h", label: "Ostatnie 24 godziny" },
  { value: "3d", label: "Ostatnie 3 dni" },
  { value: "7d", label: "Ostatni tydzień" },
  { value: "14d", label: "Ostatnie 2 tygodnie" },
  { value: "30d", label: "Ostatni miesiąc" },
  { value: "90d", label: "Ostatnie 3 miesiące" },
  { value: "180d", label: "Ostatnie pół roku" },
];

export function StatsOverview() {
  const [characterOpen, setCharacterOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);

  const currentCharacterId = useBattleFiltersStore(
    (state) => state.currentCharacterId,
  );
  const setCurrentCharacterId = useBattleFiltersStore(
    (state) => state.setCurrentCharacterId,
  );
  const getFilters = useBattleFiltersStore((state) => state.getFilters);
  const updateFilters = useBattleFiltersStore((state) => state.updateFilters);

  const filters = getFilters(currentCharacterId);

  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>(
    (filters.period === "all" ? "30d" : filters.period) || "30d",
  );
  const [localMinLevel, setLocalMinLevel] = useState<number | undefined>(
    filters.minLevel,
  );
  const [localMaxLevel, setLocalMaxLevel] = useState<number | undefined>(
    filters.maxLevel,
  );

  const debouncedMinLevel = useDebounce(localMinLevel, 500);
  const debouncedMaxLevel = useDebounce(localMaxLevel, 500);

  const { data: characters = [], isLoading: isLoadingCharacters } =
    useBattleCharacters();

  useEffect(() => {
    const loadedFilters = getFilters(currentCharacterId);
    const loadedPeriod = loadedFilters.period;
    setSelectedPeriod(
      (loadedPeriod === "all" ? "30d" : loadedPeriod) || "30d",
    );
    setLocalMinLevel(loadedFilters.minLevel);
    setLocalMaxLevel(loadedFilters.maxLevel);
  }, [currentCharacterId, getFilters]);

  useEffect(() => {
    updateFilters(currentCharacterId, {
      minLevel: debouncedMinLevel,
      maxLevel: debouncedMaxLevel,
    });
  }, [debouncedMinLevel, debouncedMaxLevel, currentCharacterId, updateFilters]);

  const { data: analytics, isLoading: isLoadingAnalytics } = useBattleAnalytics(
    {
      characterId: currentCharacterId,
      period: selectedPeriod,
      minLevel: debouncedMinLevel,
      maxLevel: debouncedMaxLevel,
    },
  );

  const handleCharacterChange = (characterId: string) => {
    const newCharacterId =
      characterId === currentCharacterId ? undefined : characterId;
    setCurrentCharacterId(newCharacterId);
    setCharacterOpen(false);
  };

  const handlePeriodChange = (period: DashboardPeriod) => {
    setSelectedPeriod(period);
    updateFilters(currentCharacterId, { period });
    setPeriodOpen(false);
  };

  const selectedCharacter = characters.find(
    (char) => char.id === currentCharacterId,
  );

  const selectedPeriodLabel =
    periods.find((p) => p.value === selectedPeriod)?.label || "Ostatni miesiąc";

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
        <div className="flex items-center justify-between">
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
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs invisible">Postać</Label>
              <Popover open={characterOpen} onOpenChange={setCharacterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={characterOpen}
                    className="w-[250px] justify-between h-10"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm truncate">
                        {selectedCharacter
                          ? `${selectedCharacter.name} (${selectedCharacter.world})`
                          : "Wszystkie postacie"}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0">
                  <Command>
                    <CommandInput placeholder="Szukaj postaci..." />
                    <CommandList>
                      <CommandEmpty>Brak postaci</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setCurrentCharacterId(undefined);
                            setCharacterOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !currentCharacterId ? "opacity-100" : "opacity-0",
                            )}
                          />
                          Wszystkie postacie
                        </CommandItem>
                        {characters.map((char) => (
                          <CommandItem
                            key={char.id}
                            value={`${char.name} ${char.world}`}
                            onSelect={() => handleCharacterChange(char.id)}
                            className="p-0 px-2 gap-0"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                currentCharacterId === char.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <PlayerTile
                              player={char}
                              cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
                              className="scale-70 mr-2"
                            />{" "}
                            {char.name} ({char.world})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label className="text-xs invisible">Okres</Label>
              <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={periodOpen}
                    className="w-[220px] justify-between h-10"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm truncate">
                        {selectedPeriodLabel}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0">
                  <Command>
                    <CommandList>
                      <CommandEmpty>Brak opcji</CommandEmpty>
                      <CommandGroup>
                        {periods.map((period) => (
                          <CommandItem
                            key={period.value}
                            value={period.value}
                            onSelect={() => handlePeriodChange(period.value)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedPeriod === period.value
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {period.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label htmlFor="min-level-overview" className="text-xs">
                Min. poziom przeciwnika
              </Label>
              <Input
                id="min-level-overview"
                type="number"
                min="1"
                max="500"
                value={localMinLevel ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setLocalMinLevel(undefined);
                  } else {
                    const parsed = Number.parseInt(value, 10);
                    if (!Number.isNaN(parsed) && parsed > 0) {
                      setLocalMinLevel(parsed);
                    }
                  }
                }}
                className="w-[140px] h-10"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="max-level-overview" className="text-xs">
                Max. poziom przeciwnika
              </Label>
              <Input
                id="max-level-overview"
                type="number"
                min="1"
                max="500"
                value={localMaxLevel ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setLocalMaxLevel(undefined);
                  } else {
                    const parsed = Number.parseInt(value, 10);
                    if (!Number.isNaN(parsed) && parsed > 0) {
                      setLocalMaxLevel(parsed);
                    }
                  }
                }}
                className="w-[140px] h-10"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
