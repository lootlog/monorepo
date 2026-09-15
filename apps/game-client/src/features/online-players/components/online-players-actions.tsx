import { WindowActionButton } from "@/components/draggable-window/window-action-button";
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

const ICON_SIZE = 14;

export const OnlinePlayersActions: FC<OnlinePlayersActionsProps> = ({
  viewMode,
  toggleViewMode,
  filtersVisible,
  toggleFiltersVisible,
}) => {
  const { t } = useTranslation("onlinePlayers");
  const isAccountsView = viewMode === "accounts";

  return (
    <>
      <WindowActionButton
        label={t(
          filtersVisible ? "actions.hideFilters" : "actions.showFilters",
        )}
        active={filtersVisible}
        onClick={toggleFiltersVisible}
      >
        <Filter size={ICON_SIZE} aria-hidden="true" />
      </WindowActionButton>
      <WindowActionButton
        label={t(
          isAccountsView
            ? "actions.showMembersView"
            : "actions.showAccountsView",
        )}
        active={isAccountsView}
        onClick={toggleViewMode}
      >
        {isAccountsView ? (
          <List size={ICON_SIZE} aria-hidden="true" />
        ) : (
          <MapPinned size={ICON_SIZE} aria-hidden="true" />
        )}
      </WindowActionButton>
    </>
  );
};
