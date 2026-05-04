import { Button } from "@lootlog/ui/components/button";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/config/routes";
import { RouteErrorState } from "./route-error-state";

export const UserRouteNotFound = () => {
  const { t } = useTranslation();

  return (
    <RouteErrorState
      status={404}
      primaryAction={
        <Button onClick={() => window.location.assign(ROUTES.user.dashboard)}>
          {t("common.routeErrors.actions.goToDashboard")}
        </Button>
      }
    />
  );
};
