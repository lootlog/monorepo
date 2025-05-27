import { DraggableWindow } from "@/components/draggable-window";
import { Button } from "@/components/ui/button";
import { useGlobalContext } from "@/contexts/global-context";
import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect, useRef, useCallback } from "react";

export const Settings = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isAuthenticated, loginWithPopup, loginWithRedirect, logout } =
    useAuth0();
  const { timersOpen, setTimersOpen, newInterface } = useGlobalContext();
  const [isWidgetLoaded, setisWidgetLoaded] = useState(false);

  const handleLogin = () => {
    loginWithPopup();
    // loginWithRedirect();
  };

  const handleLogout = () => {
    logout();
  };

  const handleTimersToggle = () => {
    setTimersOpen(!timersOpen);
  };

  const handleSettingsOpen = useCallback(() => {
    setIsSettingsOpen((prev) => !prev);
  }, []);

  const handleSettingsOpenRef = useRef(handleSettingsOpen);

  useEffect(() => {
    handleSettingsOpenRef.current = handleSettingsOpen;
  }, [handleSettingsOpen]);

  useEffect(() => {
    if (newInterface && !isWidgetLoaded) {
      const serverStoragePos = window.Engine.serverStorage.get(
        window.Engine.widgetManager.getPathToHotWidgetVersion()
      );

      var emptySlot = window.Engine.widgetManager.getFirstEmptyWidgetSlot();
      let emptyWidgetSlot = [emptySlot.slot, emptySlot.container];
      let lootlog_WidgetPosition = serverStoragePos?.lootlog
        ? serverStoragePos.lootlog
        : emptyWidgetSlot;

      window.Engine.widgetManager.getDefaultWidgetSet().lootlog = {
        keyName: "lootlog",
        index: lootlog_WidgetPosition[0],
        pos: lootlog_WidgetPosition[1],
        txt: "Lootlog",
        type: "violet",
        alwaysExist: true,
        default: true,
        clb: () => handleSettingsOpenRef.current(),
      };

      window.Engine.widgetManager.createOneWidget(
        "lootlog",
        { lootlog: lootlog_WidgetPosition },
        true,
        []
      );
      window.Engine.widgetManager.setEnableDraggingButtonsWidget(false);

      let iconStyle = document.createElement("style");
      iconStyle.innerHTML = `.main-buttons-container .widget-button .icon.lootlog {
          background-image: url("https://i.imgur.com/BUCxHlv.png");
          background-position: 50% 50%;
      }`;
      document.head.appendChild(iconStyle);
      setisWidgetLoaded(true);
    }
  }, [newInterface, isWidgetLoaded]);

  return (
    <>
      {!newInterface && (
        <DraggableWindow id="settings-trigger">
          <div className="ll-bg-black ll-text-white ll-flex">
            <Button onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
              Lootlog
            </Button>
            <div>drag</div>
          </div>
        </DraggableWindow>
      )}
      {isSettingsOpen && (
        <DraggableWindow id="settings-window">
          <div className="ll-bg-black ll-text-white ll-w-96">
            <div>Ustawienia</div>
            <div>
              <Button onClick={handleTimersToggle}>Pokaż/ukryj timery</Button>
              {!isAuthenticated && (
                <Button onClick={handleLogin}>Zaloguj się</Button>
              )}
              {isAuthenticated && (
                <Button onClick={handleLogout}>Wyloguj się</Button>
              )}
            </div>
          </div>
        </DraggableWindow>
      )}
    </>
  );
};
