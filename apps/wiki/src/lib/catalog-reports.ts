import type {
  CatalogReportDtoOutputReason,
  CatalogReportDtoOutputSubjectType,
} from "@lootlog/client/catalog";

export const REPORT_REASONS = {
  ITEM: ["NOT_IN_GAME", "WRONG_DETAILS", "WRONG_DROPS", "OTHER"],
  NPC: [
    "NOT_IN_GAME",
    "WRONG_DETAILS",
    "WRONG_DROPS",
    "WRONG_LOCATIONS",
    "OTHER",
  ],
} as const satisfies Record<
  CatalogReportDtoOutputSubjectType,
  ReadonlyArray<CatalogReportDtoOutputReason>
>;

export const REPORT_COMMENT_MAX_LENGTH = 500;
