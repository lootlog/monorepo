import { createContext } from "react";

export type GuildContextProviderValue = {
  world: string;
  setWorld: (world: string) => void;
};

export const GuildContext = createContext<GuildContextProviderValue | null>(
  null,
);
GuildContext.displayName = "GuildContext";
