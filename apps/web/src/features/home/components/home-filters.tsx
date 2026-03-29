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
import { usePlayerKillStats } from "../hooks/use-player-kill-stats";
import {
  TimeBucketSelect,
  type TimeBucket,
} from "../../stats/components/time-bucket-select";

type HomeFiltersProps = {
  filters: HomeFilters;
  onWorldChange: (world: string | undefined) => void;
  onTimeBucketChange: (timeBucket: TimeBucket) => void;
};

export const HomeFiltersBar: React.FC<HomeFiltersProps> = ({
  filters,
  onWorldChange,
  onTimeBucketChange,
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
      <TimeBucketSelect
        value={filters.timeBucket ?? "all"}
        onValueChange={onTimeBucketChange}
      />
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
    </div>
  );
};
