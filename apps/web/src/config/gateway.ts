export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL;

const resolveGatewaySocketPath = (environment: {
  readonly VITE_GATEWAY_SOCKET_PATH?: string;
}) => environment.VITE_GATEWAY_SOCKET_PATH ?? "/ws";

export const GATEWAY_SOCKET_PATH = resolveGatewaySocketPath({
  VITE_GATEWAY_SOCKET_PATH: import.meta.env.VITE_GATEWAY_SOCKET_PATH,
});
