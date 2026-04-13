import { Button } from "@lootlog/ui/components/button";
import { RotateCw } from "lucide-react";
import { useNavigate, type ErrorComponentProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getRouteErrorMessage } from "@/lib/router/route-errors";
import { RouteErrorState } from "./route-error-state";
import { useRouteError } from "./use-route-error";

export const GuildRouteError = ({ error, reset }: ErrorComponentProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { normalizedStatus, handleRetry } = useRouteError(error, reset);

  return (
    <RouteErrorState
      status={normalizedStatus}
      title={t(`common.routeErrors.status.${normalizedStatus}.title`)}
      description={
        getRouteErrorMessage(error) ??
        t(`common.routeErrors.status.${normalizedStatus}.description`)
      }
      primaryAction={
        <Button onClick={handleRetry}>
          <RotateCw className="mr-2 size-4" />
          {t("common.routeErrors.actions.retry")}
        </Button>
      }
      secondaryAction={
        <Button variant="outline" onClick={() => void navigate({ to: "/@me" })}>
          {t("common.routeErrors.actions.goToDashboard")}
        </Button>
      }
    />
  );
};
