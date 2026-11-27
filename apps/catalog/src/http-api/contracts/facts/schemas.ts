import * as Schema from "effect/Schema";
import { GameVersionSchema } from "@lootlog/schema/game-version";
import {
  NonNegativeSafeInteger,
  PositiveSafeInteger,
} from "@lootlog/schema/http-scalars";
import {
  GAME_FACT_KINDS,
  GameFact,
  ObservedGameFact,
} from "@lootlog/game-facts/facts";

const CATALOG_FACT_SOURCES = ["RECORDING"] as const;

export const CatalogFactSource = Schema.Literals(CATALOG_FACT_SOURCES).annotate(
  {
    description:
      "`RECORDING` for facts read from a protocol recording a moderator uploaded.",
  },
);

export type CatalogFactSource = typeof CatalogFactSource.Type;

const MAX_FACTS_PER_SUBMISSION = 20_000;

export const CatalogFactSubmissionRequest = Schema.Struct({
  submissionKey: Schema.String.check(
    Schema.isPattern(/^[a-f0-9]{64}$/u).annotate({
      expected: "a SHA-256 hex digest",
    }),
  ).annotate({
    description:
      "The SHA-256 of the recording; one recording is imported once per extractor version.",
  }),
  source: CatalogFactSource,
  gameVersion: GameVersionSchema,
  world: Schema.String.check(Schema.isPattern(/^[a-z0-9-]{1,40}$/u)),
  extractorVersion: PositiveSafeInteger,
  facts: Schema.Array(ObservedGameFact).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(MAX_FACTS_PER_SUBMISSION),
  ),
}).annotate({ identifier: "CatalogFactSubmissionRequest" });

export type CatalogFactSubmissionRequest =
  typeof CatalogFactSubmissionRequest.Type;

const CatalogFactPreviewStatus = Schema.Literals([
  "NEW",
  "SAME",
  "CHANGED",
  "OLDER",
]).annotate({
  description:
    "`NEW` when the catalog knows nothing about the subject, `SAME` when it already shows this, `CHANGED` when this replaces what it shows, `OLDER` when the catalog shows something observed later.",
});

const CatalogFactKind = Schema.Literals(GAME_FACT_KINDS);

const CatalogFactPreviewDto_Output = Schema.Struct({
  factIndex: NonNegativeSafeInteger.annotate({
    description:
      "Position of the fact in the submitted list; repeated facts are previewed once, at their first position.",
  }),
  kind: CatalogFactKind,
  subject: Schema.String,
  status: CatalogFactPreviewStatus,
  current: Schema.NullOr(GameFact).annotate({
    description:
      "What the catalog shows for the subject now, when it differs from the fact.",
  }),
}).annotate({ identifier: "CatalogFactPreviewDto_Output" });

export const CatalogFactPreviewResponse = Schema.Struct({
  alreadyImported: Schema.Boolean.annotate({
    description:
      "Whether this recording was imported before with this extractor version.",
  }),
  facts: Schema.Array(CatalogFactPreviewDto_Output).annotate({
    description: "One entry per distinct submitted fact, in submission order.",
  }),
}).annotate({ identifier: "CatalogFactPreviewResponse" });

export type CatalogFactPreviewResponse = typeof CatalogFactPreviewResponse.Type;

export const CatalogFactSubmissionResponse = Schema.Struct({
  submissionId: Schema.String,
  alreadyImported: Schema.Boolean.annotate({
    description:
      "Whether this recording was imported before with this extractor version; nothing changed then.",
  }),
  newVariants: NonNegativeSafeInteger.annotate({
    description: "Facts the catalog had not seen in this form before.",
  }),
  confirmedVariants: NonNegativeSafeInteger.annotate({
    description: "Facts the catalog already knew, now confirmed again.",
  }),
}).annotate({ identifier: "CatalogFactSubmissionResponse" });

export type CatalogFactSubmissionResponse =
  typeof CatalogFactSubmissionResponse.Type;
