import { createContext } from "react";
import type { GatewayClient } from "@/lib/gateway-client";

export type GatewayProviderValue = {
  connected: boolean;
  joined: boolean;
  socket: GatewayClient;
  lootUnreadCounts: Record<string, number>;
};

export const GatewayContext = createContext<GatewayProviderValue | undefined>(
  undefined,
);

GatewayContext.displayName = "GatewayContext";
