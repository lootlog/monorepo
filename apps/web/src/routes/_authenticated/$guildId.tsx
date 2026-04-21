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
  isRouteLoaderCancelledError,
  throwForbiddenRouteError,
  throwNotFoundIfResponseMatches,
} from "@/lib/router/route-errors";

export const Route = createFileRoute("/_authenticated/$guildId")({
  component: GuildRouteProviders,
  beforeLoad: ({ params }) => {
    return {
      guildId: params.guildId,
    };
  },
  loader: async ({ context, params }) => {
    try {
      const guild = await context.queryClient.ensureQueryData(
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
      );

      const [guildMember, permissions] = await Promise.all([
        context.queryClient.ensureQueryData(
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
        context.queryClient.ensureQueryData(
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
        permissions.includes(Permission.OWNER) || Boolean(guildMember?.active);

      if (!canAccessGuild) {
        throwForbiddenRouteError();
      }

      return {
        guild,
        guildMember,
        permissions,
      };
    } catch (error) {
      if (isRouteLoaderCancelledError(error)) {
        return;
      }

      throwNotFoundIfResponseMatches(error);
    }
  },
  errorComponent: GuildRouteError,
  notFoundComponent: GuildRouteNotFound,
});
