import { Timers } from "@/features/timers/timers";
import { Settings } from "@/features/settings/settings";
import { useGameEventsParser } from "@/hooks/use-game-events-parser";
import { useGlobalContext } from "./contexts/global-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { createWidgetButton } from "@/utils/game/create-widget-button";

function App() {
  useGameEventsParser();
  const { initialized } = useGlobalContext();
  const { lootlogWindowOpen, setLootlogWindowOpen, newInterface } =
    useGlobalContext();
  const [isWidgetLoaded, setisWidgetLoaded] = useState(false);
  const openRef = useRef(lootlogWindowOpen);
  openRef.current = lootlogWindowOpen;

  const handleLootlogWindowToggle = useCallback(() => {
    setLootlogWindowOpen(!openRef.current);
    openRef.current = !openRef.current;
  }, []);

  useEffect(() => {
    if (newInterface && !isWidgetLoaded) {
      setisWidgetLoaded(true);

      createWidgetButton({
        id: "lootlog",
        tooltip: "Lootlog",
        callback: handleLootlogWindowToggle,
        type: "violet",
      });
    }
  }, [newInterface, isWidgetLoaded]);

  return (
    initialized && (
      <>
        <Timers />
        <Settings />
      </>
    )
  );
}

export default App;
