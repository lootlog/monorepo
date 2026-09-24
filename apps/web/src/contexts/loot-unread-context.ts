import { createContext, useContext } from "react";

export const LootUnreadContext = createContext<Record<string, number>>({});

export const useLootUnreadCounts = () => useContext(LootUnreadContext);
