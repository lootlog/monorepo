import { useEffect } from "react";
import { getSocket, type AccessUpdate } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import type { AirTagScopeUpdateEvent } from "@lootlog/schema/air-tag";
import { airTagRuntime } from "./air-tag-runtime";

export const useAirTags = (): void => {
  const connected = useGlobalStore((state) => state.socketState.connected);
  const joined = useGlobalStore((state) => state.socketState.joined);

  useEffect(() => {
    airTagRuntime.configure({ connected, joined });
  }, [connected, joined]);

  useEffect(() => {
    if (!connected || !joined) {
      return;
    }

    const socket = getSocket();

    const handleScopeUpdate = (event: AirTagScopeUpdateEvent) => {
      airTagRuntime.handleScopeUpdate(event);
    };

    const handlePermissionsUpdated = (payload: AccessUpdate) => {
      airTagRuntime.handlePermissionsUpdated(payload);
    };

    const handlePresencePublished = (payload: {
      organizationIds: readonly string[];
    }) => {
      airTagRuntime.handlePresencePublished(payload.organizationIds);
    };

    socket.on("air-tag.scope-updated", handleScopeUpdate);
    socket.on("access.updated", handlePermissionsUpdated);
    socket.on("presence.published", handlePresencePublished);

    return () => {
      socket.off("air-tag.scope-updated", handleScopeUpdate);
      socket.off("access.updated", handlePermissionsUpdated);
      socket.off("presence.published", handlePresencePublished);
    };
  }, [connected, joined]);

  useEffect(() => {
    return () => airTagRuntime.shutdown();
  }, []);
};
