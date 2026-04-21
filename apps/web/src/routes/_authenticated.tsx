import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthenticationGuard } from "@/components/auth/authentication-guard";
import { AppLayout } from "@/components/layout/app-layout";
import { GatewayProvider } from "@/contexts/gateway-context";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { authScopesQueryOptions } from "@/hooks/api/use-auth-scopes";
import { prefetchGuildsControllerGetUserGuildsQuery } from "@/lib/api/generated/main/guilds/guilds";
import { prefetchUsersControllerGetUserPreferencesQuery } from "@/lib/api/generated/main/users/users";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

function AuthenticatedLayout() {
  return (
    <AuthenticationGuard>
      <GatewayProvider>
        <AppLayout />
      </GatewayProvider>
    </AuthenticationGuard>
  );
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const [session] = await Promise.all([
      context.queryClient.ensureQueryData(sessionQueryOptions),
      new Promise((resolve) => setTimeout(resolve, 300)),
    ]);

    if (!session || !session.data?.session) {
      throw redirect({
        to: "/signin",
        search: {
          redirect: location.href,
        },
      });
    }

    return {
      session,
    };
  },
  loader: ({ context }) =>
    withRouteLoaderCancellation(async () => {
      await Promise.all([
        context.queryClient.ensureQueryData(authScopesQueryOptions()),
        prefetchGuildsControllerGetUserGuildsQuery(context.queryClient),
        prefetchUsersControllerGetUserPreferencesQuery(context.queryClient),
      ]);

      return null;
    }),
  component: AuthenticatedLayout,
});
