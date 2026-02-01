import { useTranslation } from "react-i18next";
import { Globe, Search, User } from "lucide-react";
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

export type KillsFiltersState = {
  world?: string;
  characterId?: number;
  npcTypes?: NpcType[];
  search?: string;
};

type KillsFiltersProps = {
  filters: KillsFiltersState;
  onWorldChange: (world: string | undefined) => void;
  onCharacterChange: (characterId: number | undefined) => void;
  onNpcTypeChange: (npcTypes: NpcType[] | undefined) => void;
  onSearchChange: (search: string) => void;
};

export const KillsFilters: React.FC<KillsFiltersProps> = ({
  filters,
  onWorldChange,
  onCharacterChange,
  onNpcTypeChange,
  onSearchChange,
}) => {
  const { t } = useTranslation();
  const { data } = usePlayerKillStats();

  const worlds = data?.overview.killsByWorld
    ? Object.keys(data.overview.killsByWorld).sort()
    : [];

  const characters = data?.characters ?? [];

  const handleWorldChange = (value: string) => {
    onWorldChange(value === "all" ? undefined : value);
  };

  const handleCharacterChange = (value: string) => {
    onCharacterChange(value === "all" ? undefined : Number(value));
  };

  const handleNpcTypeChange = (value: string) => {
    onNpcTypeChange(value === "all" ? undefined : [value as NpcType]);
  };

  return (
    <div className="sticky top-0 z-10 bg-background border-b p-4">
      <div className="flex flex-col md:flex-row gap-4 flex-wrap items-end">
        <div className="relative w-full md:w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("kills.ranking.search")}
            value={filters.search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <Select
          value={filters.world ?? "all"}
          onValueChange={handleWorldChange}
        >
          <SelectTrigger className="w-full md:w-[180px] h-10">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
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
          value={filters.characterId?.toString() ?? "all"}
          onValueChange={handleCharacterChange}
        >
          <SelectTrigger className="w-full md:w-[220px] h-10">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <SelectValue
                placeholder={t("kills.home.filters.allCharacters")}
              />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("kills.home.filters.allCharacters")}
            </SelectItem>
            {characters.map((char) => (
              <SelectItem
                key={char.characterId}
                value={char.characterId.toString()}
              >
                {char.characterName} ({char.characterLvl}
                {char.characterProf})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.npcTypes?.[0] ?? "all"}
          onValueChange={handleNpcTypeChange}
        >
          <SelectTrigger className="w-full md:w-[160px] h-10">
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
      </div>
    </div>
  );
};
