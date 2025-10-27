import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthenticationGuard } from "@/components/auth/authentication-guard";
import { Layout } from "@/components/layout/layout";
import { GatewayProvider } from "@/contexts/gateway-context";
import { guildsQueryOptions } from "@/hooks/api/guilds/use-guilds";
import { userPreferencesQueryOptions } from "@/hooks/api/user/use-user-preferences";
import { authScopesQueryOptions } from "@/hooks/api/use-auth-scopes";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { FullScreenLoading } from "@/components/ui/full-screen-loading";

function AuthenticatedLayout() {
  return (
    <AuthenticationGuard>
      <GatewayProvider>
        <Layout />
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
  loader: async ({ context }) => {
    await Promise.allSettled([
      context.queryClient.ensureQueryData(guildsQueryOptions),
      context.queryClient.ensureQueryData(userPreferencesQueryOptions),
      context.queryClient.ensureQueryData(authScopesQueryOptions),
    ]);
  },
  pendingComponent: FullScreenLoading,
  component: AuthenticatedLayout,
});
