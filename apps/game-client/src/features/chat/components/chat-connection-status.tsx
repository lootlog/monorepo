import { AsyncStatusStack } from "@/components/async-status-stack";
import { useTranslation } from "react-i18next";

type Props = {
  status: { partialError: boolean; offline: boolean; refreshing: boolean };
  failedGuildCount: number;
  onRetry: () => void;
};

export function ChatConnectionStatus({
  status,
  failedGuildCount,
  onRetry,
}: Props) {
  const { t } = useTranslation("chat");

  return (
    <AsyncStatusStack
      error={status.partialError}
      errorLabel={
        failedGuildCount > 0
          ? t("states.status.partialError", { count: failedGuildCount })
          : t("states.refreshError")
      }
      offline={status.offline}
      offlineLabel={t("states.offline")}
      refreshing={status.refreshing}
      refreshingLabel={t("states.refreshing")}
      onRetry={onRetry}
      retryLabel={t("actions.retry", { ns: "common" })}
    />
  );
}
