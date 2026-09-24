import { useSyncExternalStore } from "react";
import { useGateway } from "@/hooks/utils/use-gateway";
import {
  OrganizationPresence,
  unavailablePresence,
} from "@/lib/organization-presence";

export const useOrganizationPresence = (guildId: string | undefined) => {
  const { socket, connected, joined } = useGateway();

  const presence =
    guildId && connected && joined
      ? OrganizationPresence.for(socket, guildId)
      : unavailablePresence;

  const snapshot = useSyncExternalStore(
    presence.subscribe,
    presence.getSnapshot,
  );

  return { ...snapshot, refetch: presence.refetch };
};
