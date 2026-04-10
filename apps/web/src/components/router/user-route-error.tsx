import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Button } from "@lootlog/ui/components/button";
import { RotateCw } from "lucide-react";
import {
  useNavigate,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { HomeLayout } from "@/components/layout/home-layout";
import {
  getRouteErrorMessage,
  getRouteErrorStatus,
} from "@/lib/router/route-errors";
import { RouteErrorState } from "./route-error-state";

export const UserRouteError = ({ error, reset }: ErrorComponentProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const queryErrorResetBoundary = useQueryErrorResetBoundary();
  const status = getRouteErrorStatus(error);
  const normalizedStatus =
    status === 401 || status === 403 || status === 404 ? status : 500;

  const handleRetry = () => {
    queryErrorResetBoundary.reset();
    reset();
    void router.invalidate();
  };

  return (
    <HomeLayout>
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
            onClick={() => void navigate({ to: "/@me" })}
          >
            {t("common.routeErrors.actions.goToDashboard")}
          </Button>
        }
      />
    </HomeLayout>
  );
};
