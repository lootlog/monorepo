import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import type { HomeFilters } from "../hooks/use-home-filters";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { usePlayerKillStats } from "../hooks/use-player-kill-stats";

type HomeFiltersProps = {
  filters: HomeFilters;
  onWorldChange: (world: string | undefined) => void;
};

export const HomeFiltersBar: React.FC<HomeFiltersProps> = ({
  filters,
  onWorldChange,
}) => {
  const { t } = useTranslation();
  const { data } = usePlayerKillStats();

  const worlds = data?.overview.killsByWorld
    ? Object.keys(data.overview.killsByWorld).sort()
    : [];

  const handleWorldChange = (value: string) => {
    onWorldChange(value === "all" ? undefined : value);
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
              {capitalizeFirstLetter(world)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
