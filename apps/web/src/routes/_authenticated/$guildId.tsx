import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Fragment } from "react";
import { GuildRouteError } from "@/components/router/guild-route-error";
import { GuildRouteNotFound } from "@/components/router/guild-route-not-found";
import { GuildWatchedItemsProvider } from "@/contexts/guild-watched-items-provider";
import { GuildSearch } from "@/features/guild/loots-list/components/loots-filters/guild-search";
import type { SessionData } from "@/hooks/auth/use-session";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildWorldFromUrl } from "@/hooks/context/use-guild-world";
import { rememberOrganization } from "@/lib/last-organization";
import {
  type loadOrganization,
  loadOrganizationRoute,
  ORGANIZATION_OPEN_PENDING_MS,
} from "@/lib/router/organization-loader";
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

function GuildLayout() {
  const guildId = useGuildId();

  useGuildWorldFromUrl();

  return (
    <GuildWatchedItemsProvider>
      <GuildSearch />
      <Fragment key={guildId}>
        <Outlet />
      </Fragment>
    </GuildWatchedItemsProvider>
  );
}

export const Route = createFileRoute("/_authenticated/$guildId")({
  staticData: {
    navigation: ({ match, organizationName }) => ({
      documentContext:
        organizationName ??
        Option.getOrUndefined(decodeOrganizationLoaderData(match.loaderData))
          ?.guild?.name,
    }),
  },
  component: GuildLayout,
  pendingMs: ORGANIZATION_OPEN_PENDING_MS,
  beforeLoad: ({ params }) => {
    return {
      guildId: params.guildId,
    };
  },
  loader: loadOrganizationRoute,
  onEnter: rememberVisitedOrganization,
  onStay: rememberVisitedOrganization,
  errorComponent: GuildRouteError,
  notFoundComponent: GuildRouteNotFound,
});
