import { findTrackableNpcType } from "../npc-types";
import { useTranslation } from "react-i18next";
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
} from "@lootlog/client/main";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";
import { SearchInput } from "@/components/ui/search-input";
import { FilterBar } from "@/components/common/filter-bar";
import { WorldSwitcher } from "@/components/common/world-switcher";

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

  const handleNpcTypeChange = (value: string | null) => {
    if (value === null) return;
    const npcType = findTrackableNpcType(value);

    if (value !== "all" && !npcType) return;
    onNpcTypeChange(npcType ? [npcType] : undefined);
  };

  const handleMinLvlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onMinLvlChange(e.target.value);
  };

  const handleMaxLvlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onMaxLvlChange(e.target.value);
  };

  return (
    <FilterBar ariaLabel={t("kills.filters.title")}>
      <SearchInput
        placeholder={t("kills.ranking.search")}
        aria-label={t("kills.ranking.search")}
        value={filters.search ?? ""}
        onChange={(e) => onSearchChange(e.target.value)}
        wrapperClassName="h-10 w-full min-w-0 md:w-[220px]"
      />

      <WorldSwitcher
        value={filters.world ?? null}
        onValueChange={(world) => onWorldChange(world ?? undefined)}
        worlds={worlds}
        showAllOption
      />

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
        <SelectTrigger
          size="lg"
          aria-label={t("kills.filters.npcType")}
          className="w-[160px] min-w-0"
        >
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
        className="w-[200px]"
      />

      <div
        role="group"
        aria-label={t("kills.filters.levelRange")}
        className="flex items-center gap-2"
      >
        <Input
          type="number"
          placeholder={t("kills.filters.minLevelShort")}
          aria-label={t("kills.filters.minLevel")}
          value={filters.minLvl ?? ""}
          onChange={handleMinLvlChange}
          className="h-10 w-[72px]"
          min={0}
        />
        <span className="text-xs text-muted-foreground" aria-hidden="true">
          –
        </span>
        <Input
          type="number"
          placeholder={t("kills.filters.maxLevelShort")}
          aria-label={t("kills.filters.maxLevel")}
          value={filters.maxLvl ?? ""}
          onChange={handleMaxLvlChange}
          className="h-10 w-[72px]"
          min={0}
        />
      </div>
    </FilterBar>
  );
};
