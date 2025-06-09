import { useContext } from "react";
import { GuildContext } from "@/contexts/guild.context";

export const useGuildContext = () => {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error(
      "useGuildContext must be used within a GuildContextProvider"
    );
  }
  return context;
};
