import { Button } from "@lootlog/ui/components/button";
import { useMatches, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { GuildLayout } from "@/components/layout/guild-layout";
import { RouteErrorState } from "./route-error-state";

export const GuildRouteNotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasResolvedGuildRoute = useMatches({
    select: (matches) =>
      matches.some(
        (match) =>
          match.routeId === "/_authenticated/$guildId" &&
          match.status === "success" &&
          match.loaderData !== undefined,
      ),
  });

  return (
    <GuildLayout showGuildChrome={hasResolvedGuildRoute}>
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
    </GuildLayout>
  );
};
