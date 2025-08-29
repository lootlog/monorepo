import { gameEventsManager } from "@/lib/game-events-manager";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useGameEventHandlers } from "@/hooks/game-events/use-game-event-handlers";
import { useEffect, useRef, useState } from "react";

export const useGameEventsParser = () => {
  const [initialized, setInitialized] = useState(false);
  const { settings } = useNpcDetectorStore();
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const { gameInitialized, handleEvent, handleInitialNpcsDetection } =
    useGameEventHandlers(settingsRef);

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
  }, [gameInitialized]);
};
