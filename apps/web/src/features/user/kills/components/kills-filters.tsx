import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
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
} from "@lootlog/api-client/react-query/main/kills";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";
import { SearchInput } from "@/components/ui/search-input";

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

  const handleWorldChange = (value: string | null) => {
    if (value === null) return;
    onWorldChange(value === "all" ? undefined : value);
  };

  const handleNpcTypeChange = (value: string | null) => {
    if (value === null) return;
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
        <SearchInput
          placeholder={t("kills.ranking.search")}
          value={filters.search ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9"
          wrapperClassName="min-w-0 md:w-[200px]"
        />

        <Select
          value={filters.world ?? "all"}
          onValueChange={handleWorldChange}
          items={[
            { value: null, label: <>{t("kills.home.filters.allWorlds")}</> },
            { value: "all", label: <>{t("kills.home.filters.allWorlds")}</> },
            ...worlds.map((world) => ({
              value: world,
              label: <>{world.charAt(0).toUpperCase() + world.slice(1)}</>,
            })),
          ]}
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
          items={[
            { value: null, label: <>{t("kills.filters.allTypes")}</> },
            { value: "all", label: <>{t("kills.filters.allTypes")}</> },
            ...TRACKABLE_NPC_TYPES.map((type) => ({
              value: type,
              label: <>{t(`npcType.${type}`)}</>,
            })),
          ]}
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
