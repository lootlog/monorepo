import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { OnlinePlayersViewMode } from "@/features/online-players/online-players.types";
import { Filter, List, MapPinned } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type OnlinePlayersActionsProps = {
  viewMode: OnlinePlayersViewMode;
  toggleViewMode: () => void;
  filtersVisible: boolean;
  toggleFiltersVisible: () => void;
};

export const OnlinePlayersActions: FC<OnlinePlayersActionsProps> = ({
  viewMode,
  toggleViewMode,
  filtersVisible,
  toggleFiltersVisible,
}) => {
  const { t } = useTranslation("onlinePlayers");
  const isAccountsView = viewMode === "accounts";
  const Icon = isAccountsView ? List : MapPinned;

  return [
    <Tooltip key="filters-tooltip">
      <TooltipTrigger asChild>
        <Filter
          className={`ll-custom-cursor-pointer ll:mt-0.5 ll:hover:stroke-gray-100 ll:transition-colors ${
            filtersVisible
              ? "ll:stroke-blue-400 ll:fill-blue-400/20"
              : "ll:stroke-gray-300"
          }`}
          size="14"
          onClick={toggleFiltersVisible}
        />
      </TooltipTrigger>
      <TooltipContent side="top">
        {filtersVisible ? t("actions.hideFilters") : t("actions.showFilters")}
      </TooltipContent>
    </Tooltip>,
    <Tooltip key="view-mode-tooltip">
      <TooltipTrigger asChild>
        <Icon
          className={`ll-custom-cursor-pointer ll:mt-0.5 ll:hover:stroke-gray-100 ll:transition-colors ${
            isAccountsView
              ? "ll:stroke-blue-400 ll:fill-blue-400/20"
              : "ll:stroke-gray-300"
          }`}
          size="14"
          onClick={toggleViewMode}
        />
      </TooltipTrigger>
      <TooltipContent side="top">
        {isAccountsView
          ? t("actions.showMembersView")
          : t("actions.showAccountsView")}
      </TooltipContent>
    </Tooltip>,
  ];
};
