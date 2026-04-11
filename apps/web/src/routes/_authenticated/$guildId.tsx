import { Permission } from "@lootlog/types";
import { createFileRoute } from "@tanstack/react-router";
import { GuildRouteProviders } from "@/components/layout/guild-route-providers";
import { GuildRouteError } from "@/components/router/guild-route-error";
import { GuildRouteNotFound } from "@/components/router/guild-route-not-found";
import { guildQueryOptions } from "@/hooks/api/guilds/use-guild";
import { guildPermissionsQueryOptions } from "@/hooks/api/guilds/use-guild-permissions";
import { guildMemberQueryOptions } from "@/hooks/api/members/use-guild-member";
import {
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
        guildQueryOptions(params.guildId),
      );

      const [guildMember, permissions] = await Promise.all([
        context.queryClient.ensureQueryData(
          guildMemberQueryOptions(params.guildId),
        ),
        context.queryClient.ensureQueryData(
          guildPermissionsQueryOptions(params.guildId),
        ),
      ]);

      const canAccessGuild =
        permissions.includes(Permission.OWNER) || guildMember.active;

      if (!canAccessGuild) {
        throwForbiddenRouteError();
      }

      return {
        guild,
        guildMember,
        permissions,
      };
    } catch (error) {
      throwNotFoundIfResponseMatches(error);
    }
  },
  errorComponent: GuildRouteError,
  notFoundComponent: GuildRouteNotFound,
});
