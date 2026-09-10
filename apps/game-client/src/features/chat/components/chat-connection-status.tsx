import { AsyncStatusIndicator } from "@/components/async-status-indicator";
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
    <div className="ll:pointer-events-auto ll:absolute ll:right-1 ll:top-1 ll:z-20 ll:flex ll:max-w-[calc(100%-8px)] ll:items-start ll:gap-1">
      <AsyncStatusIndicator
        active={status.partialError}
        kind="error"
        label={
          failedGuildCount > 0
            ? t("states.status.partialError", { count: failedGuildCount })
            : t("states.refreshError")
        }
        onRetry={onRetry}
        retryLabel={t("actions.retry", { ns: "common" })}
      />
      <AsyncStatusIndicator
        active={status.offline}
        kind="warning"
        label={t("states.offline")}
      />
      <AsyncStatusIndicator
        active={status.refreshing}
        delay
        kind="loading"
        label={t("states.refreshing")}
      />
    </div>
  );
}
