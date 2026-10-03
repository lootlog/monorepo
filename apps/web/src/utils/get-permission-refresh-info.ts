import { REFRESH_PERMISSIONS_TTL } from "@/constants/refresh-permissions-ttl";
import i18n from "@/i18n/config";

export type PermissionRefreshInfo = {
  canTriggerRefresh: boolean;
  canTriggerRefreshText: string;
};

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
    return createPermissionRefreshInfo(
      false,
      i18n.t("common.permissionRefresh.upToDate"),
    );
  }

  const updatedAtTimestamp = new Date(updatedAt).getTime();

  if (updatedAtTimestamp < currentTimestamp - REFRESH_PERMISSIONS_TTL) {
    return createPermissionRefreshInfo(
      true,
      i18n.t("common.permissionRefresh.available"),
    );
  }

  const nextRefreshTimestamp = updatedAtTimestamp + REFRESH_PERMISSIONS_TTL;

  const minutesUntilRefresh = Math.ceil(
    (nextRefreshTimestamp - currentTimestamp) / MINUTE_IN_MS,
  );

  if (minutesUntilRefresh > 0) {
    return createPermissionRefreshInfo(
      false,
      i18n.t("common.permissionRefresh.retryIn", {
        minutes: minutesUntilRefresh,
      }),
    );
  }

  return createPermissionRefreshInfo(
    false,
    i18n.t("common.permissionRefresh.upToDate"),
  );
};
