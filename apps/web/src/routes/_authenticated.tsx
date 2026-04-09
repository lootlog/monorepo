import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthenticationGuard } from "@/components/auth/authentication-guard";
import { Layout } from "@/components/layout/layout";
import { GatewayProvider } from "@/contexts/gateway-context";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";

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
  component: AuthenticatedLayout,
});
