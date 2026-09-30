import { createFileRoute } from "@tanstack/react-router";
import { GuildRouteProviders } from "@/components/layout/guild-route-providers";
import { GuildRouteError } from "@/components/router/guild-route-error";
import { GuildRouteNotFound } from "@/components/router/guild-route-not-found";
import type { SessionData } from "@/hooks/auth/use-session";
import { rememberOrganization } from "@/lib/last-organization";
import { loadOrganization } from "@/lib/router/organization-loader";
import {
  rethrowNotFoundOrError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";

const rememberVisitedOrganization = (match: {
  status: string;
  context: { session?: { data: SessionData | null } };
  loaderData?: Awaited<ReturnType<typeof loadOrganization>>;
}) => {
  const userId = match.context.session?.data?.user.id;

  if (match.status === "success" && match.loaderData?.guild && userId) {
    rememberOrganization(userId, match.loaderData.guild.id);
  }
};

export const Route = createFileRoute("/_authenticated/$guildId")({
  component: GuildRouteProviders,
  beforeLoad: ({ params }) => {
    return {
      guildId: params.guildId,
    };
  },
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      try {
        return await loadOrganization(context.queryClient, params.guildId);
      } catch (error) {
        rethrowNotFoundOrError(error);
      }
    }),
  onEnter: rememberVisitedOrganization,
  onStay: rememberVisitedOrganization,
  errorComponent: GuildRouteError,
  notFoundComponent: GuildRouteNotFound,
});
