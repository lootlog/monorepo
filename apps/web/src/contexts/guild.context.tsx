import { useGuildId } from "@/hooks/context/use-guild-id";
import React, { createContext, useState, useCallback, useRef } from "react";

type Props = {
  children: React.ReactNode;
};

export type GuildContextProviderValue = {
  world: string;
  setWorld: (world: string) => void;
};

const getStoredWorld = (guildId: string | undefined): string => {
  if (!guildId) return "";
  try {
    const stored = localStorage.getItem(`lootlog:guild:${guildId}:world`);
    return stored ? JSON.parse(stored) : "";
  } catch {
    return "";
  }
};

const saveWorld = (guildId: string | undefined, world: string) => {
  if (!guildId) return;
  try {
    localStorage.setItem(
      `lootlog:guild:${guildId}:world`,
      JSON.stringify(world),
    );
  } catch {
    // ignore storage errors
  }
};

export const GuildContextProvider: React.FC<Props> = ({ children }) => {
  const guildId = useGuildId();

  // Initialize state from localStorage once
  const [world, setWorldState] = useState<string>(() =>
    getStoredWorld(guildId),
  );

  // Track guildId changes to reload world
  const lastGuildIdRef = useRef(guildId);
  if (lastGuildIdRef.current !== guildId) {
    lastGuildIdRef.current = guildId;
    const storedWorld = getStoredWorld(guildId);
    if (storedWorld !== world) {
      setWorldState(storedWorld);
    }
  }

  // Stable reference for setWorld callback
  const guildIdRef = useRef(guildId);
  guildIdRef.current = guildId;

  const setWorld = useCallback((newWorld: string) => {
    setWorldState(newWorld);
    saveWorld(guildIdRef.current, newWorld);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const valueRef = useRef<GuildContextProviderValue>({ world, setWorld });
  if (valueRef.current.world !== world) {
    valueRef.current = { world, setWorld };
  }

  return (
    <GuildContext.Provider value={valueRef.current}>
      {children}
    </GuildContext.Provider>
  );
};

export const GuildContext = createContext<GuildContextProviderValue>(
  {} as GuildContextProviderValue,
);
GuildContext.displayName = "GuildContext";
