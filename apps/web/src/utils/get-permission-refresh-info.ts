import { REFRESH_PERMISSIONS_TTL } from "@/constants/refresh-permissions-ttl";

export type PermissionRefreshInfo = {
  canTriggerRefresh: boolean;
  canTriggerRefreshText: string;
};

const UP_TO_DATE_TEXT = "Uprawnienia s\u0105 aktualne";
const REFRESH_AVAILABLE_TEXT = "Od\u015bwie\u017c swoje uprawnienia";
const MINUTE_IN_MS = 1000 * 60;

export const getPermissionRefreshInfo = (
  updatedAt: string | null | undefined,
  currentTimestamp = Date.now(),
): PermissionRefreshInfo => {
  if (!updatedAt) {
    return {
      canTriggerRefresh: false,
      canTriggerRefreshText: UP_TO_DATE_TEXT,
    };
  }

  const updatedAtTimestamp = new Date(updatedAt).getTime();

  if (updatedAtTimestamp < currentTimestamp - REFRESH_PERMISSIONS_TTL) {
    return {
      canTriggerRefresh: true,
      canTriggerRefreshText: REFRESH_AVAILABLE_TEXT,
    };
  }

  const nextRefreshTimestamp = updatedAtTimestamp + REFRESH_PERMISSIONS_TTL;
  const minutesUntilRefresh = Math.ceil(
    (nextRefreshTimestamp - currentTimestamp) / MINUTE_IN_MS,
  );

  if (minutesUntilRefresh > 0) {
    return {
      canTriggerRefresh: false,
      canTriggerRefreshText: `Spr\u00f3buj ponownie za ${minutesUntilRefresh} min`,
    };
  }

  return {
    canTriggerRefresh: false,
    canTriggerRefreshText: UP_TO_DATE_TEXT,
  };
};
