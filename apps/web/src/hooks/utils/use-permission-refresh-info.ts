import { REFRESH_PERMISSIONS_TTL } from "@/constants/refresh-permissions-ttl";
import { useCountdown } from "@/hooks/utils/use-countdown";
import { useTranslation } from "react-i18next";

export type PermissionRefreshInfo = {
  canTriggerRefresh: boolean;
  canTriggerRefreshText: string;
};

export const usePermissionRefreshInfo = (
  updatedAt: string | null | undefined,
): PermissionRefreshInfo => {
  const { t } = useTranslation();

  const countdown = useCountdown(
    updatedAt ? new Date(updatedAt).getTime() + REFRESH_PERMISSIONS_TTL : null,
  );

  if (!updatedAt) {
    return {
      canTriggerRefresh: false,
      canTriggerRefreshText: t("common.permissionRefresh.upToDate"),
    };
  }

  if (countdown.isExpired) {
    return {
      canTriggerRefresh: true,
      canTriggerRefreshText: t("common.permissionRefresh.available"),
    };
  }

  return {
    canTriggerRefresh: false,
    canTriggerRefreshText: t("common.permissionRefresh.retryIn", {
      time: countdown.label,
    }),
  };
};
