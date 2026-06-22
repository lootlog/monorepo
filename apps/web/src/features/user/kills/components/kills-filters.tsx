import { useTranslation } from "react-i18next";
import { Globe, Search } from "lucide-react";
import { Input } from "@lootlog/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import {
  TRACKABLE_NPC_TYPES,
  type NpcType,
} from "@/features/user/kills/npc-types";
import {
  getKillsControllerGetUserKillStatsQueryKey,
  useKillsControllerGetUserKillStats,
} from "@/lib/api/generated/main/kills/kills";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";

export type KillsFiltersState = {
  world?: string;
  npcTypes?: NpcType[];
  search?: string;
  minLvl?: number;
  maxLvl?: number;
  period: KillStatsPeriod;
};

type KillsFiltersProps = {
  filters: KillsFiltersState;
  onWorldChange: (world: string | undefined) => void;
  onNpcTypeChange: (npcTypes: NpcType[] | undefined) => void;
  onSearchChange: (search: string) => void;
  onMinLvlChange: (minLvl: string) => void;
  onMaxLvlChange: (maxLvl: string) => void;
  onPeriodChange: (period: KillStatsPeriod) => void;
};

export const KillsFilters: React.FC<KillsFiltersProps> = ({
  filters,
  onWorldChange,
  onNpcTypeChange,
  onSearchChange,
  onMinLvlChange,
  onMaxLvlChange,
  onPeriodChange,
}) => {
  const { t } = useTranslation();
  const { data } = useKillsControllerGetUserKillStats(undefined, {
    query: {
      queryKey: getKillsControllerGetUserKillStatsQueryKey(),
      staleTime: 30_000,
    },
  });

  const worlds = data?.overview.killsByWorld
    ? Object.keys(data.overview.killsByWorld).sort()
    : [];

  const handleWorldChange = (value: string) => {
    onWorldChange(value === "all" ? undefined : value);
  };

  const handleNpcTypeChange = (value: string) => {
    onNpcTypeChange(value === "all" ? undefined : [value as NpcType]);
  };

  const handleMinLvlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onMinLvlChange(e.target.value);
  };

  const handleMaxLvlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onMaxLvlChange(e.target.value);
  };

  return (
    <div className="sticky top-0 z-10 w-full max-w-full overflow-hidden border-b bg-background px-3 py-3 md:px-4">
      <div className="flex min-w-0 flex-col items-stretch gap-2 md:flex-row md:flex-wrap md:items-center">
        <div className="relative min-w-0 md:w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("kills.ranking.search")}
            value={filters.search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <Select
          value={filters.world ?? "all"}
          onValueChange={handleWorldChange}
        >
          <SelectTrigger className="h-9 w-full min-w-0 md:w-[170px]">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <SelectValue placeholder={t("kills.home.filters.allWorlds")} />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("kills.home.filters.allWorlds")}
            </SelectItem>
            {worlds.map((world) => (
              <SelectItem key={world} value={world}>
                {world.charAt(0).toUpperCase() + world.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.npcTypes?.[0] ?? "all"}
          onValueChange={handleNpcTypeChange}
        >
          <SelectTrigger className="h-9 w-full min-w-0 md:w-[140px]">
            <SelectValue placeholder={t("kills.filters.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("kills.filters.allTypes")}</SelectItem>
            {TRACKABLE_NPC_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`npcType.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <KillStatsPeriodSelect
          value={filters.period}
          onValueChange={onPeriodChange}
          className="h-9 w-full min-w-0 md:w-[140px]"
        />

        <div className="flex min-w-0 items-center gap-1.5 md:w-auto">
          <Input
            type="number"
            placeholder={t("kills.filters.minLevel")}
            value={filters.minLvl ?? ""}
            onChange={handleMinLvlChange}
            className="h-9 min-w-0 flex-1 md:w-[70px]"
            min={0}
          />
          <span className="text-muted-foreground text-sm">-</span>
          <Input
            type="number"
            placeholder={t("kills.filters.maxLevel")}
            value={filters.maxLvl ?? ""}
            onChange={handleMaxLvlChange}
            className="h-9 min-w-0 flex-1 md:w-[70px]"
            min={0}
          />
        </div>
      </div>
    </div>
  );
};
