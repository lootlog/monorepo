import { IconButton } from "@/components/ui/icon-button";
import type { OnlinePlayersViewMode } from "@/features/online-players/online-players.types";
import { List, ListFilter, MapPinned } from "lucide-react";
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
      <IconButton
        label={t(
          filtersVisible ? "actions.hideFilters" : "actions.showFilters",
        )}
        active={filtersVisible}
        onClick={toggleFiltersVisible}
      >
        <ListFilter size={ICON_SIZE} aria-hidden="true" />
      </IconButton>
      <IconButton
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
      </IconButton>
    </>
  );
};
