import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { OnlinePlayersActions } from "@/features/online-players/components/online-players-actions";
import { OnlinePlayersList } from "@/features/online-players/components/online-players-list";
import { useWindowsStore } from "@/store/windows.store";
import { useTranslation } from "react-i18next";

export const OnlinePlayers = () => {
  const { t } = useTranslation("onlinePlayers");
  const open = useWindowsStore((state) => state["online-players"].open);
  const viewMode = useWindowsStore(
    (state) => state["online-players"].state.viewMode,
  );
  const filtersVisible = useWindowsStore(
    (state) => state["online-players"].state.filtersVisible,
  );
  const setOpen = useWindowsStore((state) => state.setOpen);
  const setOnlinePlayersViewMode = useWindowsStore(
    (state) => state.setOnlinePlayersViewMode,
  );
  const toggleOnlinePlayersFiltersVisible = useWindowsStore(
    (state) => state.toggleOnlinePlayersFiltersVisible,
  );

  const toggleViewMode = () => {
    setOnlinePlayersViewMode(viewMode === "members" ? "accounts" : "members");
  };

  return (
    <AnimatedWindow isOpen={open} windowKey="online-players">
      <DraggableWindow
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
          toggleFiltersVisible={toggleOnlinePlayersFiltersVisible}
        />
      >
        <OnlinePlayersList
          viewMode={viewMode}
          filtersVisible={filtersVisible}
        />
      </DraggableWindow>
    </AnimatedWindow>
  );
};
