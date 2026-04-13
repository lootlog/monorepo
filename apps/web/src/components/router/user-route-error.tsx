import { Button } from "@lootlog/ui/components/button";
import { RotateCw } from "lucide-react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/config/routes";
import { getRouteErrorMessage } from "@/lib/router/route-errors";
import { RouteErrorState } from "./route-error-state";
import { useRouteError } from "./use-route-error";

export const UserRouteError = ({ error, reset }: ErrorComponentProps) => {
  const { t } = useTranslation();
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
        <Button
          variant="outline"
          onClick={() => window.location.assign(ROUTES.user.dashboard)}
        >
          {t("common.routeErrors.actions.goToDashboard")}
        </Button>
      }
    />
  );
};
