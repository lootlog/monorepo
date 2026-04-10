import { Permission } from "@lootlog/types";
import { createFileRoute } from "@tanstack/react-router";
import { GuildLayout } from "@/components/layout/guild-layout";
import { GuildRouteError } from "@/components/router/guild-route-error";
import { GuildRouteNotFound } from "@/components/router/guild-route-not-found";
import { guildQueryOptions } from "@/hooks/api/guilds/use-guild";
import { guildPermissionsQueryOptions } from "@/hooks/api/guilds/use-guild-permissions";
import { guildMemberQueryOptions } from "@/hooks/api/members/use-guild-member";
import { throwNotFoundIfResponseMatches } from "@/lib/router/route-errors";

export const Route = createFileRoute("/_authenticated/$guildId")({
  component: GuildLayout,
  beforeLoad: ({ params }) => {
    return {
      guildId: params.guildId,
    };
  },
  loader: async ({ context, params }) => {
    try {
      const guild = await context.queryClient.ensureQueryData(
        guildQueryOptions(params.guildId, {
          suppressRouteErrorToast: true,
        }),
      );

      const [guildMember, permissions] = await Promise.all([
        context.queryClient.ensureQueryData(
          guildMemberQueryOptions(params.guildId, {
            suppressRouteErrorToast: true,
          }),
        ),
        context.queryClient.ensureQueryData(
          guildPermissionsQueryOptions(params.guildId, {
            suppressRouteErrorToast: true,
          }),
        ),
      ]);

      const canAccessGuild =
        permissions.includes(Permission.OWNER) || guildMember.active;

      if (!canAccessGuild) {
        const forbiddenError = new Error("FORBIDDEN_GUILD_ACCESS") as Error & {
          status: number;
        };
        forbiddenError.status = 403;
        throw forbiddenError;
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
