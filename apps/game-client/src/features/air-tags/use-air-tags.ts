import { useEffect } from "react";
import { GatewayEvent } from "@/config/gateway";
import { getSocket, type PermissionsUpdatedPayload } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import type {
  AirTagScopeUpdateEvent,
  AirTagUpdateEvent,
} from "@lootlog/schema/air-tag";
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

    const handleUpdate = (event: AirTagUpdateEvent) => {
      airTagRuntime.handleUpdate(event);
    };

    const handleScopeUpdate = (event: AirTagScopeUpdateEvent) => {
      airTagRuntime.handleScopeUpdate(event);
    };

    const handlePermissionsUpdated = (payload: PermissionsUpdatedPayload) => {
      airTagRuntime.handlePermissionsUpdated(payload);
    };

    const handlePresencePublished = (payload: {
      organizationIds: readonly string[];
    }) => {
      airTagRuntime.handlePresencePublished(payload.organizationIds);
    };

    socket.on(GatewayEvent.AIR_TAG_UPDATE, handleUpdate);
    socket.on(GatewayEvent.AIR_TAG_SCOPE_UPDATE, handleScopeUpdate);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    socket.on(GatewayEvent.PRESENCE_PUBLISHED, handlePresencePublished);

    return () => {
      socket.off(GatewayEvent.AIR_TAG_UPDATE, handleUpdate);
      socket.off(GatewayEvent.AIR_TAG_SCOPE_UPDATE, handleScopeUpdate);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
      socket.off(GatewayEvent.PRESENCE_PUBLISHED, handlePresencePublished);
    };
  }, [connected, joined]);

  useEffect(() => {
    return () => airTagRuntime.shutdown();
  }, []);
};
