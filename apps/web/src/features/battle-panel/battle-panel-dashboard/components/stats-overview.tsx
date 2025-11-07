import {
  Swords,
  Trophy,
  User,
  Check,
  ChevronsUpDown,
  Calendar,
  Award,
  ChevronRight,
  BarChart3,
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
import { cn } from "@lootlog/ui/lib/utils";
import { useState } from "react";
import { useBattleCharacters } from "@/hooks/api/battle-log/use-battle-characters";
import { useBattleAnalytics } from "@/hooks/api/battle-log/use-battle-analytics";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Separator } from "@lootlog/ui/components/separator";
import CountUp from "@lootlog/ui/components/count-up";
import { PlayerTile } from "@/components/battle";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { ROUTES } from "@/config/routes";
import { Link } from "@tanstack/react-router";

type Period = "24h" | "3d" | "7d" | "14d" | "30d" | "90d" | "180d";

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

const periods: Array<{ value: Period; label: string }> = [
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
  const [selectedCharacterId, setSelectedCharacterId] = useState<
    string | undefined
  >(undefined);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("30d");

  const { data: characters = [], isLoading: isLoadingCharacters } =
    useBattleCharacters();

  const { data: analytics, isLoading: isLoadingAnalytics } = useBattleAnalytics(
    {
      characterId: selectedCharacterId,
      period: selectedPeriod,
    }
  );

  const handleCharacterChange = (characterId: string) => {
    setSelectedCharacterId(
      characterId === selectedCharacterId ? undefined : characterId
    );
    setCharacterOpen(false);
  };

  const handlePeriodChange = (period: Period) => {
    setSelectedPeriod(period);
    setPeriodOpen(false);
  };

  const selectedCharacter = characters.find(
    (char) => char.id === selectedCharacterId
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
        <div className="flex items-center gap-3 flex-wrap">
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
                      setSelectedCharacterId(undefined);
                      setCharacterOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        !selectedCharacterId ? "opacity-100" : "opacity-0"
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
                          selectedCharacterId === char.id
                            ? "opacity-100"
                            : "opacity-0"
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
                <span className="text-sm truncate">{selectedPeriodLabel}</span>
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
                            : "opacity-0"
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

        <Button variant="outline" size="sm" asChild>
          <Link to={ROUTES.user.battlePanel.statistics}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Zobacz szczegółowe statystyki
            <ChevronRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
