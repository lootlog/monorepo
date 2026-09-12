import { WindowActionButton } from "@/components/window-action-button";
import type { OnlinePlayersViewMode } from "@/features/online-players/online-players.types";
import { Filter, List, MapPinned } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

const ICON_SIZE = 14;

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

  return (
    <>
      <WindowActionButton
        label={t(
          filtersVisible ? "actions.hideFilters" : "actions.showFilters",
        )}
        pressed={filtersVisible}
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
        pressed={isAccountsView}
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
