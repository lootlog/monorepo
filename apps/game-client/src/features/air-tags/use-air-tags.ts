import { useEffect } from "react";
import { GatewayEvent } from "@/config/gateway";
import { useCurrentGameAccountPreferences } from "@/hooks/use-current-game-account-preferences";
import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import type { AirTagUpdateEvent } from "@lootlog/types";
import { airTagRuntime } from "./air-tag-runtime";

export const useAirTags = (): void => {
  const { data: accountPreferences } = useCurrentGameAccountPreferences();
  const connected = useGlobalStore((state) => state.socketState.connected);
  const joined = useGlobalStore((state) => state.socketState.joined);
  const enabled = accountPreferences?.airTags?.enabled ?? false;

  useEffect(() => {
    airTagRuntime.configure({ enabled, connected, joined });
  }, [connected, enabled, joined]);

  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = (event: AirTagUpdateEvent) => {
      airTagRuntime.handleUpdate(event);
    };
    const handlePermissionsUpdated = () => {
      airTagRuntime.handlePermissionsUpdated();
    };

    socket.on(GatewayEvent.AIR_TAG_UPDATE, handleUpdate);
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    return () => {
      socket.off(GatewayEvent.AIR_TAG_UPDATE, handleUpdate);
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    };
  }, []);

  useEffect(() => {
    return () => airTagRuntime.shutdown();
  }, []);
};
