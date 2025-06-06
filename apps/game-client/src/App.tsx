import { Timers } from "@/features/timers/timers";
import { Settings } from "@/features/settings/settings";
import { useGameEventsParser } from "@/hooks/use-game-events-parser";
import { useEffect, useState } from "react";
import {
  createSIWidgetButton,
  createWidgetButton,
} from "@/utils/game/create-widget-button";
import { Chat } from "@/features/chat/chat";
import { useGlobalStore } from "@/store/global.store";
import { useInitialConfiguration } from "@/hooks/use-initial-configuration";
import { useWindowsStore } from "@/store/windows.store";

function App() {
  useGameEventsParser();
  useInitialConfiguration();

  const { gameInitialized, gameInterface } = useGlobalStore(
    (state) => state.gameState
  );
  const { toggleOpen } = useWindowsStore();
  const [isWidgetLoaded, setisWidgetLoaded] = useState(false);

  useEffect(() => {
    if (!isWidgetLoaded && gameInterface && gameInitialized) {
      setisWidgetLoaded(true);

      if (gameInterface === "ni") {
        createWidgetButton({
          id: "timers",
          tooltip: "Lootlog",
          callback: () => toggleOpen("timers"),
          type: "violet",
        });

        createWidgetButton({
          id: "lootlog-chat chat",
          tooltip: "Lootlog Chat",
          type: "violet",
          callback: () => toggleOpen("chat"),
          keyName: "chat",
        });

        createWidgetButton({
          id: "lootlog-settings config",
          tooltip: "Ustawienia lootloga",
          type: "violet",
          callback: () => toggleOpen("settings"),
          keyName: "settings",
        });
      } else {
        createSIWidgetButton({
          callback: () => toggleOpen("timers"),
          tooltip: "Lootlog",
          letter: "L",
        });
        createSIWidgetButton({
          callback: () => toggleOpen("chat"),
          tooltip: "Lootlog chat",
          top: 30,
          letter: "C",
        });
        createSIWidgetButton({
          callback: () => toggleOpen("settings"),
          tooltip: "Ustawienia lootloga",
          top: 60,
          letter: "U",
        });
      }
    }
  }, [gameInterface, isWidgetLoaded, gameInitialized]);

  return (
    <>
      <Timers />
      <Settings />
      <Chat />
    </>
  );
}

export default App;
