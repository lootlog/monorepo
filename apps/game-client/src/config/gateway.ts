export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL as string;
export const GATEWAY_SOCKET_PATH = import.meta.env
  .VITE_GATEWAY_SOCKET_PATH as string;

export enum GatewayEvent {
  //main
  INIT = "init",
  HELLO = "hello",
  DISCONNECTING = "disconnecting",
  DISCONNECT = "disconnect",
  CONNECT = "connect",

  //rooms
  JOIN = "join",

  // chat
  CHAT_MESSAGE = "chat-message",
}
