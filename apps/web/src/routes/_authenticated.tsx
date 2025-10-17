import { createFileRoute } from "@tanstack/react-router";
import { AuthenticationGuard } from "@/components/auth/authentication-guard";
import { Layout } from "@/components/layout/layout";

function AuthenticatedLayout() {
  return (
    <AuthenticationGuard>
      <Layout />
    </AuthenticationGuard>
  );
}

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});
