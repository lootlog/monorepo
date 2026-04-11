import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthenticationGuard } from "@/components/auth/authentication-guard";
import { AppLayout } from "@/components/layout/app-layout";
import { GatewayProvider } from "@/contexts/gateway-context";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { authScopesQueryOptions } from "@/hooks/api/use-auth-scopes";
import { guildsQueryOptions } from "@/hooks/api/guilds/use-guilds";
import { userPreferencesQueryOptions } from "@/hooks/api/user/use-user-preferences";

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
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(authScopesQueryOptions()),
      context.queryClient.ensureQueryData(guildsQueryOptions()),
      context.queryClient.ensureQueryData(userPreferencesQueryOptions()),
    ]);

    return null;
  },
  component: AuthenticatedLayout,
});
