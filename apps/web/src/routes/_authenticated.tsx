import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthenticationGuard } from "@/components/auth/authentication-guard";
import { AppLayout } from "@/components/layout/app-layout";
import { GatewayProvider } from "@/contexts/gateway-context";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { authScopesQueryOptions } from "@/hooks/api/use-auth-scopes";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryOptions,
  getUsersControllerGetCurrentUserGuildsQueryOptions,
  getUsersControllerGetUserPreferencesQueryOptions,
} from "@/lib/api/generated/main/users/users";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

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
    const session =
      await context.queryClient.ensureQueryData(sessionQueryOptions);

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
  loader: ({ abortController, context }) =>
    withRouteLoaderCancellation(abortController, async () => {
      void Promise.all([
        prefetchRouteQuery(context.queryClient, authScopesQueryOptions()),
        prefetchRouteQuery(
          context.queryClient,
          getUsersControllerGetCurrentUserAccessibleGuildsQueryOptions(),
        ),
        prefetchRouteQuery(
          context.queryClient,
          getUsersControllerGetCurrentUserGuildsQueryOptions(),
        ),
        prefetchRouteQuery(
          context.queryClient,
          getUsersControllerGetUserPreferencesQueryOptions(),
        ),
      ]).catch(() => undefined);

      return null;
    }),
  component: AuthenticatedLayout,
});
