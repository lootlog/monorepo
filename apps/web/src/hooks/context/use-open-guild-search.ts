import { GuildSearchContext } from "@/contexts/guild-search-context";
import { useContext } from "react";

/** Opens the Organization search palette; a no-op outside an Organization. */
export const useOpenGuildSearch = () => {
  const setOpen = useContext(GuildSearchContext);

  return () => setOpen?.(true);
};
