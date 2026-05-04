import { Button } from "@lootlog/ui/components/button";
import { RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

type RouteRetryButtonProps = {
  onRetry: () => void;
};

export const RouteRetryButton = ({ onRetry }: RouteRetryButtonProps) => {
  const { t } = useTranslation();

  return (
    <Button onClick={onRetry}>
      <RotateCw className="mr-2 size-4" />
      {t("common.routeErrors.actions.retry")}
    </Button>
  );
};
