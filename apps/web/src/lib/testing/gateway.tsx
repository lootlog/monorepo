import {
  RealtimeClient,
  type ServerEvent,
  type RealtimeConnectionState,
} from "@lootlog/client/realtime";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import type { Permission } from "@lootlog/schema/permissions";
import { vi } from "vitest";
import type { PropsWithChildren } from "react";
import { GatewayClient } from "@/lib/gateway-client";
import { GatewayContext } from "@/contexts/gateway-context";

/** Builds the access policy the gateway sends for a member of these Organizations. */
export const createTestAccessPolicy = (
  organizationIds: readonly string[],
  permissions: Permission[] = [],
) =>
  createAccessPolicySnapshot(
    organizationIds.map((id) => ({
      guild: { id, ownerId: "owner" },
      roles: [{ permissions, lvlRangeFrom: 0, lvlRangeTo: 500 }],
    })),
    "discord-member",
  );

export const createTestGateway = (
  options: { connected?: boolean; joined?: boolean } = {},
) => {
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
      value={{
        socket,
        connected: options.connected ?? true,
        joined: options.joined ?? options.connected ?? true,
      }}
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
