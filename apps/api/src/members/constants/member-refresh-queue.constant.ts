export const MEMBER_REFRESH_QUEUE = "member-refresh";
export const MEMBER_BULK_REFRESH_QUEUE = "member-bulk-refresh";

export const MEMBER_REFRESH_PRIORITY = {
  MANUAL: 1,
  CONNECT: 2,
  BULK: 4,
  BACKGROUND: 8,
} as const;
