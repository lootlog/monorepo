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

  const status = normalizeRouteErrorStatus(getRouteErrorStatus(error));
  const handleRetry = useRouteErrorRetry(reset);

  const goToDashboard = (
    <Button
      variant={status === 500 ? "outline" : "default"}
      onClick={() => void navigate({ to: "/@me" })}
    >
      {t("common.routeErrors.actions.goToDashboard")}
    </Button>
  );

  // Only an unexpected failure can change on retry; the server will repeat
  // a missing permission or a missing Organization.
  if (status !== 500) {
    return (
      <RouteErrorState
        status={status}
        details={getRouteErrorMessage(error)}
        title={
          status === 403
            ? t("common.routeErrors.guildForbidden.title")
            : undefined
        }
        description={
          status === 403
            ? t("common.routeErrors.guildForbidden.description")
            : undefined
        }
        primaryAction={goToDashboard}
      />
    );
  }

  return (
    <RouteErrorState
      status={status}
      details={getRouteErrorMessage(error)}
      primaryAction=<RouteRetryButton onRetry={handleRetry} />
      secondaryAction={goToDashboard}
    />
  );
};
