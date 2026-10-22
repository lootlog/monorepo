import { useEffect } from "react";
import { useCurrentCharacterCatchingGuildIds } from "@/hooks/api/use-lootlog-characters-config";
import { getSocket } from "@/lib/socket";

/**
 * Presence goes where loot and timers go. The gateway also shows this
 * character the presence of those Lootlogs only, so nobody watches incognito.
 */
export const usePresencePublicationScope = (): void => {
  const organizationIds = useCurrentCharacterCatchingGuildIds();

  useEffect(() => {
    if (organizationIds) getSocket().setPresenceOrganizations(organizationIds);
  }, [organizationIds]);
};
