import { Button } from "@lootlog/ui/components/button";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

type EventReadErrorProps = {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
};

export const EventReadError = ({
  message,
  onRetry,
  isRetrying = false,
}: EventReadErrorProps) => {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-center gap-2 p-3 text-sm text-destructive"
    >
      <AlertCircle className="size-4" />
      <span>{message ?? t("events.error")}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isRetrying}
        onClick={onRetry}
      >
        {t("common.actions.retry")}
      </Button>
    </div>
  );
};
