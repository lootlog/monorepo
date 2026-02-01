import { useTranslation } from "react-i18next";
import { Globe, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import type { HomeFilters } from "../hooks/use-home-filters";
import { usePlayerKillStats } from "../hooks/use-player-kill-stats";

type HomeFiltersProps = {
  filters: HomeFilters;
  onWorldChange: (world: string | undefined) => void;
  onCharacterChange: (characterId: number | undefined) => void;
};

export const HomeFiltersBar: React.FC<HomeFiltersProps> = ({
  filters,
  onWorldChange,
  onCharacterChange,
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

  return (
    <div className="flex items-center justify-end gap-3">
      <Select value={filters.world ?? "all"} onValueChange={handleWorldChange}>
        <SelectTrigger className="w-[180px]">
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
        <SelectTrigger className="w-[220px]">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={t("kills.home.filters.allCharacters")} />
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
    </div>
  );
};
