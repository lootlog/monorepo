import { GATEWAY_SOCKET_PATH, GATEWAY_URL } from "@/config/gateway";
import { io } from "socket.io-client";

export const socket = io(GATEWAY_URL, {
  transports: ["websocket"],
  path: `${GATEWAY_SOCKET_PATH ?? ""}/socket.io`,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  timeout: 20000,
});
