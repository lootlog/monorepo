import { DraggableWindow } from "@/components/draggable-window";
import { OnlinePlayersActions } from "@/features/online-players/components/online-players-actions";
import { OnlinePlayersList } from "@/features/online-players/components/online-players-list";
import { useOnlinePlayersStore } from "@/store/online-players.store";
import { useWindowsStore } from "@/store/windows.store";
import { useTranslation } from "react-i18next";

export const OnlinePlayers = () => {
  const { t } = useTranslation("onlinePlayers");
  const open = useWindowsStore((state) => state["online-players"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const viewMode = useOnlinePlayersStore((state) => state.viewMode);
  const filtersVisible = useOnlinePlayersStore((state) => state.filtersVisible);
  const setViewMode = useOnlinePlayersStore((state) => state.setViewMode);
  const toggleFiltersVisible = useOnlinePlayersStore(
    (state) => state.toggleFiltersVisible,
  );

  const toggleViewMode = () => {
    setViewMode(viewMode === "members" ? "accounts" : "members");
  };

  return (
    <DraggableWindow
      isOpen={open}
      id="online-players"
      title={t("window.title")}
      onClose={() => setOpen("online-players", false)}
      variant="default"
      minHeight={108}
      minWidth={242}
      actions=<OnlinePlayersActions
        viewMode={viewMode}
        toggleViewMode={toggleViewMode}
        filtersVisible={filtersVisible}
        toggleFiltersVisible={toggleFiltersVisible}
      />
    >
      <OnlinePlayersList viewMode={viewMode} filtersVisible={filtersVisible} />
    </DraggableWindow>
  );
};
