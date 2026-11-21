/** Transport schemas owned by the catalog reports HTTP module. */
import * as Schema from "effect/Schema";
import { GameVersionSchema } from "@lootlog/schema/game-version";
import {
  DateTimeString,
  NonNegativeSafeInteger,
  PageSize,
  PositiveSafeInteger,
} from "@lootlog/schema/http-scalars";

const CATALOG_REPORT_SUBJECT_TYPES = ["ITEM", "NPC"] as const;

export const CatalogReportSubjectType = Schema.Literals(
  CATALOG_REPORT_SUBJECT_TYPES,
).annotate({
  description: "The kind of catalog page: an item or an NPC.",
});

export type CatalogReportSubjectType = typeof CatalogReportSubjectType.Type;

const CATALOG_REPORT_REASONS = [
  "NOT_IN_GAME",
  "WRONG_DETAILS",
  "WRONG_DROPS",
  "WRONG_LOCATIONS",
  "OTHER",
] as const;

export const CatalogReportReason = Schema.Literals(
  CATALOG_REPORT_REASONS,
).annotate({
  description:
    "What is wrong: `NOT_IN_GAME` for an entry players cannot get, such as a test item; `WRONG_DETAILS` for its name, level, type or statistics; `WRONG_DROPS` for the NPCs an item drops from or the items an NPC drops; `WRONG_LOCATIONS` for the maps an NPC is fought on; `OTHER`, which needs a comment.",
});

export type CatalogReportReason = typeof CatalogReportReason.Type;

const CATALOG_REPORT_STATUSES = ["OPEN", "RESOLVED", "REJECTED"] as const;

export const CatalogReportStatus = Schema.Literals(
  CATALOG_REPORT_STATUSES,
).annotate({
  description:
    "`OPEN` until a moderator reviews it; `RESOLVED` when the report was right, `REJECTED` when it was not. A moderator may open a reviewed report again.",
});

export type CatalogReportStatus = typeof CatalogReportStatus.Type;

/** The longest comment a report keeps. */
const CATALOG_REPORT_COMMENT_MAX_LENGTH = 500;

const CatalogReportComment = Schema.String.check(
  Schema.isMaxLength(CATALOG_REPORT_COMMENT_MAX_LENGTH).annotate({
    expected: `a value with a length of at most ${CATALOG_REPORT_COMMENT_MAX_LENGTH}`,
  }),
);

const CatalogReportSubjectFields = {
  subjectType: CatalogReportSubjectType,
  gameVersion: GameVersionSchema,
  subjectId: PositiveSafeInteger.annotate({
    description: "The item or NPC id the page shows.",
  }),
};

export const CatalogReportDto_Output = Schema.Struct({
  id: Schema.String,
  ...CatalogReportSubjectFields,
  reason: CatalogReportReason,
  comment: Schema.NullOr(Schema.String),
  status: CatalogReportStatus,
  createdAt: DateTimeString,
  reviewedAt: Schema.NullOr(DateTimeString),
}).annotate({
  description: "A report that a catalog page shows something wrong",
  identifier: "CatalogReportDto_Output",
});

export type CatalogReportDto_Output = typeof CatalogReportDto_Output.Type;

export const CreateCatalogReportRequest = Schema.Struct({
  ...CatalogReportSubjectFields,
  reason: CatalogReportReason,
  comment: Schema.optionalKey(CatalogReportComment),
}).annotate({ identifier: "CreateCatalogReportRequest" });

export type CreateCatalogReportRequest = typeof CreateCatalogReportRequest.Type;

export const CatalogOwnReportQuery = Schema.Struct(CatalogReportSubjectFields);

export type CatalogOwnReportQuery = typeof CatalogOwnReportQuery.Type;

export const CatalogOwnReportResponse = Schema.Struct({
  report: Schema.NullOr(CatalogReportDto_Output).annotate({
    description: "The caller's open report about the page, if any.",
  }),
}).annotate({ identifier: "CatalogOwnReportResponse" });

export const CatalogReportViewerResponse = Schema.Struct({
  canModerate: Schema.Boolean.annotate({
    description: "Whether the caller may review reports.",
  }),
}).annotate({ identifier: "CatalogReportViewerResponse" });

export const CatalogReportParams = Schema.Struct({
  reportId: Schema.String.check(Schema.isUUID()),
});

export const CatalogReportsQuery = Schema.Struct({
  status: Schema.optionalKey(CatalogReportStatus.annotate({ default: "OPEN" })),
  limit: Schema.optionalKey(PageSize.annotate({ default: 20 })),
  offset: Schema.optionalKey(NonNegativeSafeInteger.annotate({ default: 0 })),
});

export type CatalogReportsQuery = typeof CatalogReportsQuery.Type;

const CatalogReportedSubjectDto_Output = Schema.Struct({
  ...CatalogReportSubjectFields,
  name: Schema.NullOr(Schema.String).annotate({
    description: "The page's current name; `null` once the catalog lost it.",
  }),
  icon: Schema.NullOr(Schema.String),
  reports: Schema.Array(CatalogReportDto_Output).annotate({
    description: "The page's reports of the requested status, newest first.",
  }),
}).annotate({
  description: "A catalog page and its reports",
  identifier: "CatalogReportedSubjectDto_Output",
});

export const CatalogReportsResponseDto_Output = Schema.Struct({
  subjects: Schema.Array(CatalogReportedSubjectDto_Output).annotate({
    description:
      "Pages with reports of the requested status, the most reported first, then the most recently reported.",
  }),
  total: NonNegativeSafeInteger.annotate({
    description: "Pages with reports of the requested status.",
  }),
}).annotate({
  description: "Reported catalog pages",
  identifier: "CatalogReportsResponseDto_Output",
});

export type CatalogReportsResponseDto_Output =
  typeof CatalogReportsResponseDto_Output.Type;

export const ReviewCatalogReportsRequest = Schema.Struct({
  reportIds: Schema.Array(Schema.String.check(Schema.isUUID())).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(100),
  ),
  status: CatalogReportStatus,
}).annotate({ identifier: "ReviewCatalogReportsRequest" });

export type ReviewCatalogReportsRequest =
  typeof ReviewCatalogReportsRequest.Type;
