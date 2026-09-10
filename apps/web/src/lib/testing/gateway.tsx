import {
  RealtimeClient,
  type ServerEvent,
  type RealtimeConnectionState,
} from "@lootlog/client/realtime";
import { vi } from "vitest";
import type { PropsWithChildren } from "react";
import { GatewayClient } from "@/lib/gateway-client";
import { GatewayContext } from "@/contexts/gateway-context";

export const createTestGateway = () => {
  const eventListeners = new Set<(event: ServerEvent) => void>();
  const stateListeners = new Set<(state: RealtimeConnectionState) => void>();
  vi.spyOn(RealtimeClient.prototype, "subscribe").mockImplementation(
    (listener) => {
      eventListeners.add(listener);

      return () => {
        eventListeners.delete(listener);
      };
    },
  );
  vi.spyOn(RealtimeClient.prototype, "subscribeState").mockImplementation(
    (listener) => {
      stateListeners.add(listener);

      return () => {
        stateListeners.delete(listener);
      };
    },
  );
  const request = vi.spyOn(RealtimeClient.prototype, "request");
  const socket = new GatewayClient();

  const wrapper = ({ children }: PropsWithChildren) => (
    <GatewayContext
      value={{ socket, connected: true, joined: true, lootUnreadCounts: {} }}
    >
      {children}
    </GatewayContext>
  );

  return {
    socket,
    request,
    wrapper,
    deliver: (event: ServerEvent) =>
      eventListeners.forEach((listener) => listener(event)),
    setConnectionState: (state: RealtimeConnectionState) =>
      stateListeners.forEach((listener) => listener(state)),
  };
};
