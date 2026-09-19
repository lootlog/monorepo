import { Schema } from "effect";
import { NonNegativeInt } from "./primitives.js";

const MAP_PING_TYPES = ["attention", "enemy", "regroup", "avoid"] as const;

export type MapPingType = (typeof MAP_PING_TYPES)[number];

const MapPingTypeSchema = Schema.Literals(MAP_PING_TYPES);

const MapPingRejectCodeSchema = Schema.Literals([
  "forbidden",
  "invalid-context",
  "invalid-payload",
  "rate-limited",
  "temporarily-unavailable",
]);

export const isMapPingType = Schema.is(MapPingTypeSchema);

export interface MapPingSendPayload {
  expectedMapId: number;
  type: MapPingType;
  x: number;
  y: number;
}

type MapPingRejectCode =
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

export const MapPingSendPayloadSchema = Schema.Struct({
  expectedMapId: NonNegativeInt,
  type: MapPingTypeSchema,
  x: NonNegativeInt,
  y: NonNegativeInt,
});

export const MapPingAckSchema = Schema.Union([
  Schema.Struct({
    status: Schema.Literal("accepted"),
    pingId: Schema.NonEmptyString,
  }),
  Schema.Struct({
    status: Schema.Literal("rejected"),
    code: MapPingRejectCodeSchema,
    retryAfterMs: Schema.optionalKey(NonNegativeInt),
  }),
]);

export const MapPingEventSchema = Schema.Struct({
  pingId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  mapId: NonNegativeInt,
  type: MapPingTypeSchema,
  x: NonNegativeInt,
  y: NonNegativeInt,
  sender: Schema.Struct({
    characterId: Schema.NonEmptyString,
    name: Schema.NonEmptyString,
  }),
  createdAt: NonNegativeInt,
});
