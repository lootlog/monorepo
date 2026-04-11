import { Button } from "@lootlog/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RouteErrorState } from "./route-error-state";

export const UserRouteNotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <RouteErrorState
      status={404}
      title={t("common.routeErrors.status.404.title")}
      description={t("common.routeErrors.status.404.description")}
      primaryAction={
        <Button onClick={() => void navigate({ to: "/@me" })}>
          {t("common.routeErrors.actions.goToDashboard")}
        </Button>
      }
    />
  );
};
