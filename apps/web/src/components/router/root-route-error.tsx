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

export const RootRouteError = ({ error, reset }: ErrorComponentProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const normalizedStatus = normalizeRouteErrorStatus(
    getRouteErrorStatus(error),
  );
  const actionLabel =
    normalizedStatus === 401
      ? t("common.routeErrors.actions.goToSignIn")
      : t("common.routeErrors.actions.goToInit");
  const handleRetry = useRouteErrorRetry(reset);

  const handleNavigate = () => {
    if (normalizedStatus === 401) {
      void navigate({ to: "/signin" });
      return;
    }

    void navigate({ to: "/init" });
  };

  return (
    <div className="flex min-h-dvh bg-background">
      <RouteErrorState
        status={normalizedStatus}
        description={getRouteErrorMessage(error)}
        primaryAction={<RouteRetryButton onRetry={handleRetry} />}
        secondaryAction={
          <Button variant="outline" onClick={handleNavigate}>
            {actionLabel}
          </Button>
        }
      />
    </div>
  );
};
