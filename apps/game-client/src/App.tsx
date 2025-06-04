import { Timers } from "@/features/timers/timers";
import { Settings } from "@/features/settings/settings";
import { useGameEventsParser } from "@/hooks/use-game-events-parser";
import { useGlobalContext } from "./contexts/global-context";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSIWidgetButton,
  createWidgetButton,
} from "@/utils/game/create-widget-button";
import { Chat } from "@/features/chat/chat";

function App() {
  useGameEventsParser();
  const { initialized } = useGlobalContext();
  const {
    lootlogWindowOpen,
    setLootlogWindowOpen,
    setChatWindowOpen,
    gameInterface,
    chatWindowOpen,
  } = useGlobalContext();
  const [isWidgetLoaded, setisWidgetLoaded] = useState(false);

  const lootlogWindowOpenRef = useRef(lootlogWindowOpen);
  lootlogWindowOpenRef.current = lootlogWindowOpen;

  const chatWindowOpenRef = useRef(chatWindowOpen);
  chatWindowOpenRef.current = chatWindowOpen;

  const handleLootlogWindowToggle = useCallback(() => {
    setLootlogWindowOpen(!lootlogWindowOpenRef.current);
    lootlogWindowOpenRef.current = !lootlogWindowOpenRef.current;
  }, []);

  const handleChatWindowToggle = useCallback(() => {
    setChatWindowOpen(!chatWindowOpenRef.current);
    chatWindowOpenRef.current = !chatWindowOpenRef.current;
  }, []);

  useEffect(() => {
    if (!isWidgetLoaded && gameInterface) {
      setisWidgetLoaded(true);

      if (gameInterface === "ni") {
        createWidgetButton({
          id: "lootlog",
          tooltip: "Lootlog",
          callback: handleLootlogWindowToggle,
          type: "violet",
        });

        createWidgetButton({
          id: "lootlog-chat chat",
          tooltip: "Lootlog Chat",
          type: "violet",
          callback: handleChatWindowToggle,
          keyName: "chat",
        });
      } else {
        createSIWidgetButton({
          callback: handleLootlogWindowToggle,
          tooltip: "Lootlog",
        });

        createSIWidgetButton({
          callback: handleChatWindowToggle,
          tooltip: "Lootlog chat",
          left: 88,
        });
      }
    }
  }, [gameInterface, isWidgetLoaded]);

  return (
    initialized && (
      <>
        <Timers />
        <Settings />
        <Chat />
      </>
    )
  );
}

export default App;
