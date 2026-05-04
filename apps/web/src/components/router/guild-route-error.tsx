import { Button } from "@lootlog/ui/components/button";
import { useNavigate, type ErrorComponentProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  getRouteErrorMessage,
  getRouteErrorStatus,
  normalizeRouteErrorStatus,
} from "@/lib/router/route-errors";
import { RouteRetryButton } from "./route-retry-button";
import { RouteErrorState } from "./route-error-state";
import { useRouteErrorRetry } from "./use-route-error-retry";

export const GuildRouteError = ({ error, reset }: ErrorComponentProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
        <Button variant="outline" onClick={() => void navigate({ to: "/@me" })}>
          {t("common.routeErrors.actions.goToDashboard")}
        </Button>
      }
    />
  );
};
