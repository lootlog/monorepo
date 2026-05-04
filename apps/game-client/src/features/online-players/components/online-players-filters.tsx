import { SearchInput } from "@/components/ui/search-input";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL_PROFESSIONS_VALUE,
  MAX_ONLINE_PLAYER_LEVEL,
  MIN_ONLINE_PLAYER_LEVEL,
  PROFESSION_OPTIONS,
  type OnlinePlayersFiltersValue,
  type ProfessionFilterValue,
} from "@/features/online-players/online-players-list.helpers";
import type { ChangeEventHandler, FC } from "react";
import { useTranslation } from "react-i18next";

type OnlinePlayersFiltersProps = {
  searchQuery: string;
  filters: OnlinePlayersFiltersValue;
  onSearchChange: ChangeEventHandler<HTMLInputElement>;
  onMinLvlChange: ChangeEventHandler<HTMLInputElement>;
  onMaxLvlChange: ChangeEventHandler<HTMLInputElement>;
  onProfessionChange: (profession: ProfessionFilterValue) => void;
};

export const OnlinePlayersFilters: FC<OnlinePlayersFiltersProps> = ({
  searchQuery,
  filters,
  onSearchChange,
  onMinLvlChange,
  onMaxLvlChange,
  onProfessionChange,
}) => {
  const { t } = useTranslation("onlinePlayers");

  return (
    <div className="ll:pb-1 ll:flex ll:gap-1">
      <SearchInput
        placeholder={t("search.placeholder")}
        value={searchQuery}
        onChange={onSearchChange}
      />
      <Input
        aria-label={t("filters.minLvlLabel")}
        value={filters.minLvl.toString()}
        onChange={onMinLvlChange}
        className="ll:w-9 input-no-spinner ll:px-0.5 ll:text-center"
        max={MAX_ONLINE_PLAYER_LEVEL}
        min={MIN_ONLINE_PLAYER_LEVEL}
        type="number"
        inputMode="numeric"
      />
      <Input
        aria-label={t("filters.maxLvlLabel")}
        value={filters.maxLvl.toString()}
        onChange={onMaxLvlChange}
        className="ll:w-9 input-no-spinner ll:px-0.5 ll:text-center"
        max={MAX_ONLINE_PLAYER_LEVEL}
        min={MIN_ONLINE_PLAYER_LEVEL}
        type="number"
        inputMode="numeric"
      />
      <Select
        value={filters.selectedProfession}
        onValueChange={onProfessionChange}
      >
        <SelectTrigger
          aria-label={t("filters.professionLabel")}
          className="ll:w-12 ll:px-1"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="ll:min-w-28">
          <SelectItem value={ALL_PROFESSIONS_VALUE}>
            {t("filters.professions.all")}
          </SelectItem>
          {PROFESSION_OPTIONS.map((profession) => (
            <SelectItem key={profession} value={profession}>
              {t(`filters.professions.${profession}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
