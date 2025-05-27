import { GatewayContext } from "@/contexts/gateway-context";
import { useContext } from "react";

export const useGateway = () => {
  const value = useContext(GatewayContext);

  return { ...value };
};
