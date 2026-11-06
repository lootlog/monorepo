import { createFileRoute } from "@tanstack/react-router";
import { GuildRouteProviders } from "@/components/layout/guild-route-providers";
import { GuildRouteError } from "@/components/router/guild-route-error";
import { GuildRouteNotFound } from "@/components/router/guild-route-not-found";
import type { SessionData } from "@/hooks/auth/use-session";
import { rememberOrganization } from "@/lib/last-organization";
import {
  loadOrganization,
  loadOrganizationShell,
  ORGANIZATION_OPEN_PENDING_MS,
} from "@/lib/router/organization-loader";
import {
  rethrowNotFoundOrError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";
import { Option, Schema } from "effect";

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

const decodeOrganizationLoaderData = Schema.decodeUnknownOption(
  Schema.Struct({
    guild: Schema.optional(
      Schema.Struct({ name: Schema.optional(Schema.String) }),
    ),
  }),
);

export const Route = createFileRoute("/_authenticated/$guildId")({
  staticData: {
    navigation: ({ match, organizationName }) => ({
      documentContext:
        organizationName ??
        Option.getOrUndefined(decodeOrganizationLoaderData(match.loaderData))
          ?.guild?.name,
    }),
  },
  component: GuildRouteProviders,
  // Opening another Organization keeps the current page painted while the
  // next one loads, and swaps them in one step; the rail marks the target at
  // once. Only a slow load falls back to a skeleton.
  pendingMs: ORGANIZATION_OPEN_PENDING_MS,
  beforeLoad: ({ params }) => {
    return {
      guildId: params.guildId,
    };
  },
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      try {
        const organization = await loadOrganization(
          context.queryClient,
          params.guildId,
        );

        await loadOrganizationShell(
          context.queryClient,
          params.guildId,
          organization.accessPolicy,
        );

        return organization;
      } catch (error) {
        rethrowNotFoundOrError(error);
      }
    }),
  onEnter: rememberVisitedOrganization,
  onStay: rememberVisitedOrganization,
  errorComponent: GuildRouteError,
  notFoundComponent: GuildRouteNotFound,
});
