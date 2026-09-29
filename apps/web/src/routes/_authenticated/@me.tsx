import { createFileRoute, Outlet } from "@tanstack/react-router";
import { UserRouteError } from "@/components/router/user-route-error";
import { UserRouteNotFound } from "@/components/router/user-route-not-found";
import type { SessionData } from "@/hooks/auth/use-session";
import { rememberPersonalPanel } from "@/lib/last-organization";

const rememberVisitedPersonalPanel = (match: {
  context: {
    session?: { data: SessionData | null };
    isRestoreFallback?: boolean;
  };
}) => {
  const userId = match.context.session?.data?.user.id;

  // A failed restoration lands here without the user choosing this panel.
  if (!match.context.isRestoreFallback && userId) {
    rememberPersonalPanel(userId);
  }
};

export const Route = createFileRoute("/_authenticated/@me")({
  beforeLoad: ({ location }) => ({
    isRestoreFallback: Boolean(location.state.restoreFallback),
  }),
  component: Outlet,
  onEnter: rememberVisitedPersonalPanel,
  onStay: rememberVisitedPersonalPanel,
  errorComponent: UserRouteError,
  notFoundComponent: UserRouteNotFound,
});
