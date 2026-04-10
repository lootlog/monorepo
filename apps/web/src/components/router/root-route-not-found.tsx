import { Button } from "@lootlog/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RouteErrorState } from "./route-error-state";

export const RootRouteNotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background">
      <RouteErrorState
        status={404}
        title={t("common.routeErrors.status.404.title")}
        description={t("common.routeErrors.status.404.description")}
        primaryAction={
          <Button onClick={() => void navigate({ to: "/init" })}>
            {t("common.routeErrors.actions.goToInit")}
          </Button>
        }
      />
    </div>
  );
};
