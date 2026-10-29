import { createContext, useContext } from "react";
import type { RuntimeConfig } from "@/config/runtime-config";
import type { WikiAuthClient } from "@/lib/auth-client";

type WikiContextValue = {
  config: RuntimeConfig;
  authClient: WikiAuthClient;
};

export const WikiContext = createContext<WikiContextValue | null>(null);

export const useWikiContext = () => {
  const value = useContext(WikiContext);

  if (!value) throw new Error("useWikiContext must be used in WikiContext.");

  return value;
};
