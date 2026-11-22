export {
  isOrganizationAccessDenied,
  RealtimeClient,
  RealtimeRequestError,
  type CommandData,
  type CommandType,
  type RealtimeClientOptions,
  type RealtimeConnectionState,
  type RealtimeWebSocket,
  type RealtimeWebSocketFactory,
} from "./realtime-client.js";

export { REALTIME_JSON_SUBPROTOCOL } from "@lootlog/protocol/realtime";

export { RealtimeCodecError } from "@lootlog/protocol/realtime/codec";

export type {
  BasicPresence,
  ClientCommand,
  CommandSuccess,
  PresenceWithLocation,
  ServerEvent,
  SessionJoined,
  SubscriptionScope,
} from "@lootlog/protocol/realtime";
