import { gameEventsManager } from "@/lib/game-events-manager";
import { useGameEventHandlers } from "@/hooks/game-events/use-game-event-handlers";
import { useEffect, useState } from "react";

export const useGameEventsParser = () => {
  const [initialized, setInitialized] = useState(false);

  const { gameInitialized, handleEvent, handleInitialNpcsDetection } =
    useGameEventHandlers();

  const setupGameEventsHandler = () => {
    gameEventsManager.setProcessor(handleEvent);
    setInitialized(true);
  };

  const removeGameEventsHandler = () => {
    gameEventsManager.removeProcessor();
  };

  useEffect(() => {
    if (!gameInitialized || initialized) return;
    setupGameEventsHandler();
    handleInitialNpcsDetection();
    return () => removeGameEventsHandler();
  }, [gameInitialized, handleEvent, handleInitialNpcsDetection, initialized]);
};
