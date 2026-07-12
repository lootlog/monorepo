export interface MapPingSendPayload {
  expectedMapId: number;
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
  x: number;
  y: number;
  sender: {
    characterId: string;
    name: string;
  };
  createdAt: number;
}
