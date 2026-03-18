import { REFRESH_PERMISSIONS_TTL } from "@/constants/refresh-permissions-ttl";

export type PermissionRefreshInfo = {
  canTriggerRefresh: boolean;
  canTriggerRefreshText: string;
};

export const getPermissionRefreshInfo = (
  updatedAt: string | null | undefined,
  currentTimestamp = Date.now(),
): PermissionRefreshInfo => {
  if (!updatedAt) {
    return {
      canTriggerRefresh: false,
      canTriggerRefreshText: "Uprawnienia są aktualne",
    };
  }

  const updatedAtTimestamp = new Date(updatedAt).getTime();
  const canTriggerRefresh =
    updatedAtTimestamp < currentTimestamp - REFRESH_PERMISSIONS_TTL;

  if (canTriggerRefresh) {
    return {
      canTriggerRefresh: true,
      canTriggerRefreshText: "Odśwież swoje uprawnienia",
    };
  }

  const nextRefreshTimestamp = updatedAtTimestamp + REFRESH_PERMISSIONS_TTL;
  const minutesUntilRefresh = Math.ceil(
    (nextRefreshTimestamp - currentTimestamp) / (1000 * 60),
  );

  if (minutesUntilRefresh > 0) {
    return {
      canTriggerRefresh: false,
      canTriggerRefreshText: `Spróbuj ponownie za ${minutesUntilRefresh} min`,
    };
  }

  return {
    canTriggerRefresh: false,
    canTriggerRefreshText: "Uprawnienia są aktualne",
  };
};
