import { useEffect, useRef, useState } from "react";
import { useGlobalStore } from "@/store/global.store";
import { EventDispatcher } from "@/lib/event-dispatcher";

export const useGameEventHandlers = () => {
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);
  const [initialized, setInitialized] = useState(false);
  const dispatcherRef = useRef<EventDispatcher | null>(null);

  useEffect(() => {
    if (initialized) return;

    const dispatcher = new EventDispatcher();
    dispatcherRef.current = dispatcher;
    dispatcher.register();
    setInitialized(true);
  }, [initialized]);

  useEffect(() => {
    if (!gameInitialized || !initialized) return;

    dispatcherRef.current?.handleInitialEvents();
  }, [gameInitialized, initialized]);

  useEffect(() => {
    return () => {
      dispatcherRef.current?.cleanup();
    };
  }, []);
};
