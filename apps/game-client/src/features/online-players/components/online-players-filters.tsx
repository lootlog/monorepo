import { SearchInput } from "@/components/ui/search-input";
import { Input } from "@/components/ui/input";
import {
  toolbarStripLightClassName,
  toolbarStripLightDividerClassName,
  toolbarStripRowClassName,
} from "@/components/ui/toolbar-strip";
import { cn } from "cn";
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
    <div className={toolbarStripLightClassName}>
      <div className={toolbarStripRowClassName}>
        <SearchInput
          size="sm"
          variant="borderless"
          placeholder={t("search.placeholder")}
          value={searchQuery}
          onChange={onSearchChange}
        />
        <Input
          aria-label={t("filters.minLvlLabel")}
          value={filters.minLvl.toString()}
          onChange={onMinLvlChange}
          className={cn(
            toolbarStripLightDividerClassName,
            "ll:w-8 ll:shrink-0 input-no-spinner ll:px-0.5 ll:text-center",
          )}
          variant="borderless"
          max={MAX_ONLINE_PLAYER_LEVEL}
          min={MIN_ONLINE_PLAYER_LEVEL}
          type="number"
          inputMode="numeric"
        />
        <Input
          aria-label={t("filters.maxLvlLabel")}
          value={filters.maxLvl.toString()}
          onChange={onMaxLvlChange}
          className={cn(
            toolbarStripLightDividerClassName,
            "ll:w-8 ll:shrink-0 input-no-spinner ll:px-0.5 ll:text-center",
          )}
          variant="borderless"
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
            className={cn(
              toolbarStripLightDividerClassName,
              "ll:data-[size=sm]:h-full ll:w-22 ll:shrink-0 ll:gap-1 ll:[&>span]:block ll:[&>span]:flex-1 ll:[&>span]:text-center ll:[&_svg]:size-3 ll:border-y-0 ll:bg-transparent ll:data-[size=sm]:ps-1 ll:data-[size=sm]:pe-0.5",
            )}
            size="sm"
            variant="strip"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="ll:min-w-28">
            <SelectItem value={ALL_PROFESSIONS_VALUE}>
              {t("filters.allProfessions")}
            </SelectItem>
            {PROFESSION_OPTIONS.map((profession) => (
              <SelectItem key={profession} value={profession}>
                {t(`professions.${profession}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
