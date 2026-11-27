import type { BingoBoardSummaryResponseDtoStatus } from "@lootlog/client/main";

export const BINGO_STATUS_BADGE_VARIANT = {
  ACTIVE: "live",
  DRAFT: "outline",
  FINISHED: "secondary",
} as const satisfies Record<BingoBoardSummaryResponseDtoStatus, string>;

export const BINGO_STATUS_TEXT_CLASS = {
  ACTIVE: "text-signal-live",
  DRAFT: "text-foreground",
  FINISHED: "text-muted-foreground",
} as const satisfies Record<BingoBoardSummaryResponseDtoStatus, string>;
