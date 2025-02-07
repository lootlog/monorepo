import { useGuildId } from "hooks/use-guild-id";
import React, { createContext } from "react";
import { useLocalStorage } from "usehooks-ts";

type Props = {
  children: React.ReactNode;
};

export type GuildContextProviderValue = {
  world: string;
  setWorld: (world: string) => void;
};

export const GuildContextProvider: React.FC<Props> = ({ children }) => {
  const guildId = useGuildId();
  const [world, setWorld] = useLocalStorage<string>(
    `lootlog:guild:${guildId}:world`,
    ""
  );

  const value = {
    world,
    setWorld,
  };

  return (
    <GuildContext.Provider value={value}>{children}</GuildContext.Provider>
  );
};

export const GuildContext = createContext<GuildContextProviderValue>(
  {} as GuildContextProviderValue
);
GuildContext.displayName = "GuildContext";
