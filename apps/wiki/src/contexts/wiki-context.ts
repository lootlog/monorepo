import { createContext, useContext } from "react";
import type { RuntimeConfig } from "@/config/runtime-config";
import type { LootlogAuthClient } from "@lootlog/client/auth-session";

type WikiContextValue = {
  config: RuntimeConfig;
  authClient: LootlogAuthClient;
};

export const WikiContext = createContext<WikiContextValue | null>(null);

export const useWikiContext = () => {
  const value = useContext(WikiContext);

  if (!value) throw new Error("useWikiContext must be used in WikiContext.");

  return value;
};
