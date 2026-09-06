import { useRef, useState } from "react";
import { Button } from "@lootlog/ui/components/button";
import { RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

type RouteRetryButtonProps = {
  onRetry: () => void | Promise<void>;
};

export const RouteRetryButton = ({ onRetry }: RouteRetryButtonProps) => {
  const { t } = useTranslation();
  const [isPending, setIsPending] = useState(false);
  const busy = useRef(false);
  const retry = async () => {
    if (busy.current) return;
    busy.current = true;
    setIsPending(true);
    await Promise.resolve()
      .then(onRetry)
      .finally(() => {
        busy.current = false;
        setIsPending(false);
      });
  };

  return (
    <Button
      onClick={retry}
      loading={isPending}
      icon={<RotateCw className="size-4" />}
    >
      {t("common.routeErrors.actions.retry")}
    </Button>
  );
};
