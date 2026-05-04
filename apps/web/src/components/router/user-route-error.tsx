import { Button } from "@lootlog/ui/components/button";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/config/routes";
import {
  getRouteErrorMessage,
  getRouteErrorStatus,
  normalizeRouteErrorStatus,
} from "@/lib/router/route-errors";
import { RouteRetryButton } from "./route-retry-button";
import { RouteErrorState } from "./route-error-state";
import { useRouteErrorRetry } from "./use-route-error-retry";

export const UserRouteError = ({ error, reset }: ErrorComponentProps) => {
  const { t } = useTranslation();
  const normalizedStatus = normalizeRouteErrorStatus(
    getRouteErrorStatus(error),
  );
  const handleRetry = useRouteErrorRetry(reset);

  return (
    <RouteErrorState
      status={normalizedStatus}
      description={getRouteErrorMessage(error)}
      primaryAction={<RouteRetryButton onRetry={handleRetry} />}
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
