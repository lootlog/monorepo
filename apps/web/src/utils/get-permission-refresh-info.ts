import { REFRESH_PERMISSIONS_TTL } from "@/constants/refresh-permissions-ttl";

export type PermissionRefreshInfo = {
  canTriggerRefresh: boolean;
  canTriggerRefreshText: string;
};

const PERMISSIONS_CURRENT_TEXT = "Uprawnienia s\u0105 aktualne";
const PERMISSIONS_REFRESH_TEXT = "Od\u015bwie\u017c swoje uprawnienia";

const createCurrentPermissionRefreshInfo = (): PermissionRefreshInfo => ({
  canTriggerRefresh: false,
  canTriggerRefreshText: PERMISSIONS_CURRENT_TEXT,
});

export const getPermissionRefreshInfo = (
  updatedAt: string | null | undefined,
  currentTimestamp = Date.now(),
): PermissionRefreshInfo => {
  if (!updatedAt) {
    return createCurrentPermissionRefreshInfo();
  }

  const updatedAtTimestamp = new Date(updatedAt).getTime();
  const canTriggerRefresh =
    updatedAtTimestamp < currentTimestamp - REFRESH_PERMISSIONS_TTL;

  if (canTriggerRefresh) {
    return {
      canTriggerRefresh: true,
      canTriggerRefreshText: PERMISSIONS_REFRESH_TEXT,
    };
  }

  const nextRefreshTimestamp = updatedAtTimestamp + REFRESH_PERMISSIONS_TTL;
  const minutesUntilRefresh = Math.ceil(
    (nextRefreshTimestamp - currentTimestamp) / (1000 * 60),
  );

  if (minutesUntilRefresh > 0) {
    return {
      canTriggerRefresh: false,
      canTriggerRefreshText: `Spr\u00f3buj ponownie za ${minutesUntilRefresh} min`,
    };
  }

  return createCurrentPermissionRefreshInfo();
};
