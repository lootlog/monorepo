import { Button } from "@lootlog/ui/components/button";
import { RotateCw } from "lucide-react";
import { useNavigate, type ErrorComponentProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { getRouteErrorMessage } from "@/lib/router/route-errors";
import { RouteErrorState } from "./route-error-state";
import { useRouteError } from "./use-route-error";

export const RootRouteError = ({ error, reset }: ErrorComponentProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { normalizedStatus, handleRetry } = useRouteError(error, reset);
  const actionLabel =
    normalizedStatus === 401
      ? t("common.routeErrors.actions.goToSignIn")
      : t("common.routeErrors.actions.goToInit");

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
          <Button variant="outline" onClick={handleNavigate}>
            {actionLabel}
          </Button>
        }
      />
    </div>
  );
};
