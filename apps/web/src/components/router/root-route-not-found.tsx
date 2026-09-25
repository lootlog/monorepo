import { Button } from "@lootlog/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RouteErrorState } from "./route-error-state";

export const RootRouteNotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh bg-background">
      <RouteErrorState
        status={404}
        primaryAction={
          <Button onClick={() => void navigate({ to: "/@me" })}>
            {t("common.routeErrors.actions.goToDashboard")}
          </Button>
        }
      />
    </div>
  );
};
