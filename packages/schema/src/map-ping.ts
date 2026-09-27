import { Schema } from "effect";
import { NonNegativeInt } from "./primitives.js";

const MAP_PING_TYPES = ["attention", "enemy", "regroup", "avoid"] as const;

export type MapPingType = (typeof MAP_PING_TYPES)[number];

const MapPingTypeSchema = Schema.Literals(MAP_PING_TYPES);

/** Margonem NPC and character ids are positive 32-bit integers. */
const MapPingCharacterIdSchema = Schema.Int.check(
  Schema.isBetween({ minimum: 1, maximum: 2_147_483_647 }),
);

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
  /** The NPC the ping targets. Older gateways and clients ignore it. */
  npcId?: number;
  /** The player the ping targets. Older gateways and clients ignore it. */
  playerId?: number;
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
  npcId?: number;
  playerId?: number;
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
  npcId: Schema.optionalKey(MapPingCharacterIdSchema),
  playerId: Schema.optionalKey(MapPingCharacterIdSchema),
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
  npcId: Schema.optionalKey(MapPingCharacterIdSchema),
  playerId: Schema.optionalKey(MapPingCharacterIdSchema),
  sender: Schema.Struct({
    characterId: Schema.NonEmptyString,
    name: Schema.NonEmptyString,
  }),
  createdAt: NonNegativeInt,
});
