import { REFRESH_PERMISSIONS_TTL } from "@/constants/refresh-permissions-ttl";

export type PermissionRefreshInfo = {
  canTriggerRefresh: boolean;
  canTriggerRefreshText: string;
};

const UP_TO_DATE_TEXT = "Uprawnienia są aktualne";
const REFRESH_AVAILABLE_TEXT = "Odśwież swoje uprawnienia";
const MINUTE_IN_MS = 1000 * 60;

const createPermissionRefreshInfo = (
  canTriggerRefresh: boolean,
  canTriggerRefreshText: string,
): PermissionRefreshInfo => ({
  canTriggerRefresh,
  canTriggerRefreshText,
});

export const getPermissionRefreshInfo = (
  updatedAt: string | null | undefined,
  currentTimestamp = Date.now(),
): PermissionRefreshInfo => {
  if (!updatedAt) {
    return createPermissionRefreshInfo(false, UP_TO_DATE_TEXT);
  }

  const updatedAtTimestamp = new Date(updatedAt).getTime();

  if (updatedAtTimestamp < currentTimestamp - REFRESH_PERMISSIONS_TTL) {
    return createPermissionRefreshInfo(true, REFRESH_AVAILABLE_TEXT);
  }

  const nextRefreshTimestamp = updatedAtTimestamp + REFRESH_PERMISSIONS_TTL;
  const minutesUntilRefresh = Math.ceil(
    (nextRefreshTimestamp - currentTimestamp) / MINUTE_IN_MS,
  );

  if (minutesUntilRefresh > 0) {
    return createPermissionRefreshInfo(
      false,
      `Spróbuj ponownie za ${minutesUntilRefresh} min`,
    );
  }

  return createPermissionRefreshInfo(false, UP_TO_DATE_TEXT);
};
