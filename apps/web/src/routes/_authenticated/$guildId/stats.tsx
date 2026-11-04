import { createFileRoute } from "@tanstack/react-router";
import { StatsLayout } from "@/components/layout/stats-layout";
import { GuildRouteError } from "@/components/router/guild-route-error";
import { GuildRouteNotFound } from "@/components/router/guild-route-not-found";

export const Route = createFileRoute("/_authenticated/$guildId/stats")({
  staticData: {
    navigation: ({ t }) => ({ label: t("common.breadcrumbs.stats") }),
  },
  component: StatsLayout,
  errorComponent: GuildRouteError,
  notFoundComponent: GuildRouteNotFound,
});
