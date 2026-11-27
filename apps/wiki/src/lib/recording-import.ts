import type {
  CatalogFactPreviewResponse,
  CatalogFactSubmissionRequest,
} from "@lootlog/client/catalog";
import {
  GAME_FACT_KINDS,
  GAME_FACTS_EXTRACTOR_VERSION,
  type GameFact,
  type GameFactKind,
} from "@lootlog/game-facts/facts";
import {
  extractRecordingFacts,
  type RecordingExtraction,
} from "@lootlog/game-facts/recording";
import { stableJsonStringify } from "@lootlog/schema/stable-json";

export type RecordingImport = {
  readonly fileName: string;
  readonly extraction: RecordingExtraction;
  readonly request: CatalogFactSubmissionRequest;
};

const sha256 = async (text: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};

export const readRecordingFile = async (
  file: File,
): Promise<RecordingImport> => {
  const text = await file.text();
  const extraction = extractRecordingFacts(text);

  return {
    fileName: file.name,
    extraction,
    request: {
      submissionKey: await sha256(text),
      source: "RECORDING",
      gameVersion: extraction.gameVersion,
      world: extraction.world,
      extractorVersion: GAME_FACTS_EXTRACTOR_VERSION,
      facts: [...extraction.facts],
    },
  };
};

export type PreviewStatus =
  CatalogFactPreviewResponse["facts"][number]["status"];

export const PREVIEW_STATUSES = [
  "NEW",
  "CHANGED",
  "OLDER",
  "SAME",
] as const satisfies ReadonlyArray<PreviewStatus>;

export type FactCounts = ReadonlyArray<{
  readonly kind: GameFactKind;
  readonly counts: Readonly<Record<PreviewStatus, number>>;
}>;

export const countFactsByKind = (
  preview: CatalogFactPreviewResponse,
): FactCounts =>
  GAME_FACT_KINDS.flatMap((kind) => {
    const facts = preview.facts.filter((fact) => fact.kind === kind);

    if (facts.length === 0) return [];

    const counts: Record<PreviewStatus, number> = {
      NEW: 0,
      CHANGED: 0,
      OLDER: 0,
      SAME: 0,
    };

    for (const fact of facts) counts[fact.status] += 1;

    return [{ kind, counts }];
  });

export type FactChange = {
  readonly field: string;
  readonly before: string;
  readonly after: string;
};

type CurrentFact = NonNullable<
  CatalogFactPreviewResponse["facts"][number]["current"]
>;

export const factChanges = (
  current: CurrentFact,
  incoming: GameFact,
): ReadonlyArray<FactChange> => {
  const before = new Map(Object.entries(current));
  const after = new Map(Object.entries(incoming));
  const fields = new Set([...before.keys(), ...after.keys()]);

  return [...fields].flatMap((field) => {
    const previous = stableJsonStringify(before.get(field) ?? null);
    const next = stableJsonStringify(after.get(field) ?? null);

    return previous === next ? [] : [{ field, before: previous, after: next }];
  });
};

export const factName = (fact: GameFact): string | null => {
  switch (fact.kind) {
    case "MAP":
    case "NPC":
    case "MONSTER_STATS":
    case "ITEM":
      return fact.name;
    case "DIALOG_NODE":
      return fact.speaker;
    case "GATEWAY":
      return fact.toMapName;
    default:
      return null;
  }
};
