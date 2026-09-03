import { Schema } from "effect";
import {
  isoDatetimeCodec,
  nullableIsoDatetimeCodec,
} from "#src/shared/schema/response-codecs";

const EventCoordinationTimer = Schema.Struct({
  npcId: Schema.Number,
  world: Schema.String,
  minSpawnTime: isoDatetimeCodec,
  maxSpawnTime: isoDatetimeCodec,
  status: Schema.Literals(["OPEN", "WAITING", "OVERDUE", "NONE"]),
  overdueMs: Schema.NullOr(Schema.Number),
});

const EventCoordinationHero = Schema.Struct({
  heroId: Schema.String,
  npcId: Schema.NullOr(Schema.Number),
  npcName: Schema.String,
  npcIcon: Schema.NullOr(Schema.String),
  npcLvl: Schema.NullOr(Schema.Number),
  timer: Schema.NullOr(EventCoordinationTimer),
  coverage: Schema.Struct({
    totalMaps: Schema.Number,
    assignedMaps: Schema.Number,
    coveredMaps: Schema.Number,
    unassignedMaps: Schema.Number,
    uncoveredMaps: Schema.Number,
    activeGapCount: Schema.Number,
  }),
  activeGaps: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      mapId: Schema.String,
      numericMapId: Schema.Number,
      mapName: Schema.String,
      gapType: Schema.Literals(["UNASSIGNED", "UNCOVERED"]),
      startedAt: isoDatetimeCodec,
      durationSeconds: Schema.Number,
    }),
  ),
  priority: Schema.Literals(["CRITICAL", "WARNING", "OK", "IDLE"]),
  recommendedAction: Schema.Literals([
    "CLOSE_WINDOW",
    "ASSIGN_MAPS",
    "JOIN_MAP",
    "WAIT",
    "NONE",
  ]),
});

export const EventCoordinationResponse = Schema.Struct({
  assignmentTimeoutMinutes: Schema.Number,
  generatedAt: isoDatetimeCodec,
  eventId: Schema.String,
  world: Schema.String,
  summary: Schema.Struct({
    criticalCount: Schema.Number,
    warningCount: Schema.Number,
    coveredMaps: Schema.Number,
    totalMaps: Schema.Number,
    nextSpawnAt: nullableIsoDatetimeCodec,
  }),
  heroes: Schema.Array(EventCoordinationHero),
});
