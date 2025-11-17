import { useContext } from "react";
import { GatewayContext } from "@/contexts/gateway-context";

export const useGateway = () => {
  const context = useContext(GatewayContext);

  if (!context) {
    throw new Error("useGateway must be used within a GatewayProvider");
  }

  return context;
};
