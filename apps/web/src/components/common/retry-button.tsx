import { Button } from "@lootlog/ui/components/button";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

type RetryButtonProps = {
  onRetry: () => void;
  isRetrying?: boolean;
  disabled?: boolean;
  size?: "sm" | "default";
};

export const RetryButton = ({
  onRetry,
  isRetrying = false,
  disabled,
  size,
}: RetryButtonProps) => {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={disabled}
      loading={isRetrying}
      icon=<RotateCcw className="size-3.5" />
      onClick={() => onRetry()}
    >
      {t("common.actions.retry")}
    </Button>
  );
};
