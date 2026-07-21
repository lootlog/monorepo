import { Permission } from "@lootlog/types";
import { createFileRoute } from "@tanstack/react-router";
import { GuildRouteProviders } from "@/components/layout/guild-route-providers";
import { GuildRouteError } from "@/components/router/guild-route-error";
import { GuildRouteNotFound } from "@/components/router/guild-route-not-found";
import {
  getGuildsControllerGetGuildByIdQueryOptions,
  getGuildsControllerGetGuildByIdQueryKey,
  getGuildsControllerGetGuildPermissionsQueryKey,
  getGuildsControllerGetGuildPermissionsQueryOptions,
} from "@/lib/api/generated/main/guilds/guilds";
import {
  getMembersControllerGetMeQueryKey,
  getMembersControllerGetMeQueryOptions,
} from "@/lib/api/generated/main/members/members";
import {
  rethrowNotFoundOrError,
  throwForbiddenRouteError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";
import { ensureRouteQueryData } from "@/lib/router/route-prefetch";

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
        const [guild, guildMember, permissions] = await Promise.all([
          ensureRouteQueryData(
            context.queryClient,
            getGuildsControllerGetGuildByIdQueryOptions(
              { guildId: params.guildId },
              {
                query: {
                  queryKey: getGuildsControllerGetGuildByIdQueryKey({
                    guildId: params.guildId,
                  }),
                  retry: true,
                },
              },
            ),
          ),
          ensureRouteQueryData(
            context.queryClient,
            getMembersControllerGetMeQueryOptions(
              { guildId: params.guildId },
              {
                query: {
                  queryKey: getMembersControllerGetMeQueryKey({
                    guildId: params.guildId,
                  }),
                  staleTime: 30_000,
                },
              },
            ),
          ),
          ensureRouteQueryData(
            context.queryClient,
            getGuildsControllerGetGuildPermissionsQueryOptions(
              { guildId: params.guildId },
              {
                query: {
                  queryKey: getGuildsControllerGetGuildPermissionsQueryKey({
                    guildId: params.guildId,
                  }),
                  staleTime: 30_000,
                },
              },
            ),
          ),
        ]);

        const canAccessGuild =
          permissions.includes(Permission.OWNER) ||
          Boolean(guildMember?.active);

        if (!canAccessGuild) {
          throwForbiddenRouteError();
        }

        return {
          guild,
          guildMember,
          permissions,
        };
      } catch (error) {
        rethrowNotFoundOrError(error);
      }
    }),
  errorComponent: GuildRouteError,
  notFoundComponent: GuildRouteNotFound,
});
