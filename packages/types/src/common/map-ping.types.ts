export const MAP_PING_TYPES = [
  "attention",
  "enemy",
  "regroup",
  "avoid",
] as const;

export type MapPingType = (typeof MAP_PING_TYPES)[number];

export const isMapPingType = (value: unknown): value is MapPingType =>
  typeof value === "string" && MAP_PING_TYPES.includes(value as MapPingType);

export interface MapPingSendPayload {
  expectedMapId: number;
  type: MapPingType;
  x: number;
  y: number;
}

export type MapPingRejectCode =
  | "forbidden"
  | "invalid-context"
  | "invalid-payload"
  | "rate-limited"
  | "temporarily-unavailable";

export type MapPingAck =
  | {
      status: "accepted";
      pingId: string;
    }
  | {
      status: "rejected";
      code: MapPingRejectCode;
      retryAfterMs?: number;
    };

export interface MapPingEvent {
  pingId: string;
  world: string;
  mapId: number;
  type: MapPingType;
  x: number;
  y: number;
  sender: {
    characterId: string;
    name: string;
  };
  createdAt: number;
}
