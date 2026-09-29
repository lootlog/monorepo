import { createFileRoute, Outlet } from "@tanstack/react-router";
import { UserRouteError } from "@/components/router/user-route-error";
import { UserRouteNotFound } from "@/components/router/user-route-not-found";
import { rememberPersonalPanel } from "@/lib/last-organization";

export const Route = createFileRoute("/_authenticated/@me")({
  beforeLoad: ({ context, location, preload }) => {
    const userId = context.session.data?.user.id;

    // A failed restoration lands here without the user choosing this panel.
    if (!preload && !location.state.restoreFallback && userId) {
      rememberPersonalPanel(userId);
    }
  },
  component: Outlet,
  errorComponent: UserRouteError,
  notFoundComponent: UserRouteNotFound,
});
