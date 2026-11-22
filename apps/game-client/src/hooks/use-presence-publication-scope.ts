import { useEffect } from "react";
import { useCurrentCharacterCatchingGuildIds } from "@/hooks/api/use-lootlog-characters-config";
import { getSocket } from "@/lib/socket";

export const usePresencePublicationScope = (): void => {
  const organizationIds = useCurrentCharacterCatchingGuildIds();

  useEffect(() => {
    getSocket().setPresenceOrganizations(organizationIds);
  }, [organizationIds]);
};
