import * as Schema from "effect/Schema";
import { GameVersion } from "@lootlog/schema/game-version";
import {
  createGameFactExtractor,
  type ExtractionCoverage,
} from "./extractor.js";
import type { ObservedGameFact } from "./facts.js";
import { decodeGamePacket } from "./packets.js";

const RecordingEvent = Schema.Struct({
  seq: Schema.Finite,
  t: Schema.Finite,
  kind: Schema.String,
  g: Schema.optionalKey(Schema.String),
  sendSeq: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  packet: Schema.optionalKey(Schema.Unknown),
});

const ProtocolRecording = Schema.Struct({
  format: Schema.Literal("margo-ni-addons/protocol"),
  version: Schema.Literal(1),
  meta: Schema.Struct({
    host: Schema.String,
    startedAt: Schema.String,
  }),
  events: Schema.Array(RecordingEvent),
});

const decodeRecording = Schema.decodeUnknownExit(
  Schema.fromJsonString(ProtocolRecording),
);

const HOST = /^([a-z0-9-]+)\.margonem\.(pl|com)$/u;

export type RecordingExtraction = {
  readonly world: string;
  readonly gameVersion: GameVersion;
  readonly startedAt: string;
  readonly facts: ReadonlyArray<ObservedGameFact>;
  readonly coverage: ExtractionCoverage;
};

class RecordingFormatError extends Error {
  override readonly name = "RecordingFormatError";
}

export const extractRecordingFacts = (json: string): RecordingExtraction => {
  const decoded = decodeRecording(json);

  if (decoded._tag === "Failure") {
    throw new RecordingFormatError("Not a protocol recording");
  }

  const { meta, events } = decoded.value;
  const host = HOST.exec(meta.host);
  const startedAt = Date.parse(meta.startedAt);

  if (!host?.[1] || Number.isNaN(startedAt)) {
    throw new RecordingFormatError("Recording from an unknown world");
  }

  const extractor = createGameFactExtractor();

  const requests = new Map(
    events.flatMap((event) =>
      event.kind === "send" && event.g !== undefined
        ? [[event.seq, event.g] as const]
        : [],
    ),
  );

  for (const event of events) {
    if (event.kind !== "recv" || event.packet === undefined) continue;

    extractor.observe(decodeGamePacket(event.packet), {
      request:
        event.sendSeq === undefined || event.sendSeq === null
          ? undefined
          : requests.get(event.sendSeq),
      observedAt: new Date(startedAt + event.t).toISOString(),
    });
  }

  return {
    world: host[1],
    gameVersion: host[2] === "com" ? GameVersion.EN : GameVersion.PL,
    startedAt: new Date(startedAt).toISOString(),
    facts: extractor.facts(),
    coverage: extractor.coverage(),
  };
};
