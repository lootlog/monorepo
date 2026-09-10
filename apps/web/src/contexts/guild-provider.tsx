/* eslint-disable react-doctor/jsx-no-constructed-context-values -- Vite React Compiler output caches this provider value and its callbacks by their actual dependencies; verified through the running Vite module transform. */
import { GuildContext } from "./guild.context";
import { useGuildId } from "@/hooks/context/use-guild-id";
import React, { useState } from "react";

type Props = {
  children: React.ReactNode;
};

type GuildContextProviderContentProps = Props & {
  guildId: string | undefined;
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

const GuildContextProviderContent: React.FC<
  GuildContextProviderContentProps
> = ({ children, guildId }) => {
  const [world, setWorldState] = useState<string>(() =>
    getStoredWorld(guildId),
  );

  const setWorld = (newWorld: string) => {
    setWorldState(newWorld);
    saveWorld(guildId, newWorld);
  };

  return (
    <GuildContext.Provider value={{ world, setWorld }}>
      {children}
    </GuildContext.Provider>
  );
};

export const GuildContextProvider: React.FC<Props> = ({ children }) => {
  const guildId = useGuildId();

  return (
    <GuildContextProviderContent
      key={guildId ?? "global-guild"}
      guildId={guildId}
    >
      {children}
    </GuildContextProviderContent>
  );
};
