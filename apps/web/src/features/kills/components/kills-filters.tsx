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
  usePlayerKillStats,
  type NpcType,
} from "@/features/home/hooks/use-player-kill-stats";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";

export type KillsFiltersState = {
  world?: string;
  npcTypes?: NpcType[];
  search?: string;
  minLvl?: number;
  maxLvl?: number;
};

type KillsFiltersProps = {
  filters: KillsFiltersState;
  onWorldChange: (world: string | undefined) => void;
  onNpcTypeChange: (npcTypes: NpcType[] | undefined) => void;
  onSearchChange: (search: string) => void;
  onMinLvlChange: (minLvl: string) => void;
  onMaxLvlChange: (maxLvl: string) => void;
};

export const KillsFilters: React.FC<KillsFiltersProps> = ({
  filters,
  onWorldChange,
  onNpcTypeChange,
  onSearchChange,
  onMinLvlChange,
  onMaxLvlChange,
}) => {
  const { t } = useTranslation();
  const { data } = usePlayerKillStats();

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
    <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
      <div className="flex flex-col md:flex-row gap-2 flex-wrap items-center">
        <div className="relative w-full md:w-[200px]">
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
          <SelectTrigger className="w-full md:w-[170px] h-9">
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
                {capitalizeFirstLetter(world)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.npcTypes?.[0] ?? "all"}
          onValueChange={handleNpcTypeChange}
        >
          <SelectTrigger className="w-full md:w-[140px] h-9">
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

        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            placeholder={t("kills.filters.minLevel")}
            value={filters.minLvl ?? ""}
            onChange={handleMinLvlChange}
            className="w-full md:w-[70px] h-9"
            min={0}
          />
          <span className="text-muted-foreground text-sm">-</span>
          <Input
            type="number"
            placeholder={t("kills.filters.maxLevel")}
            value={filters.maxLvl ?? ""}
            onChange={handleMaxLvlChange}
            className="w-full md:w-[70px] h-9"
            min={0}
          />
        </div>
      </div>
    </div>
  );
};
