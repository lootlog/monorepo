export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string;

export enum GatewayEvent {
  //main
  INIT = "init",
  HELLO = "hello",
  DISCONNECTING = "disconnecting",
  DISCONNECT = "disconnect",
  CONNECT = "connect",

  //rooms
  JOIN = "join",
}
