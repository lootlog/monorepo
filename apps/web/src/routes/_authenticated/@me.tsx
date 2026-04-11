import { createFileRoute, Outlet } from "@tanstack/react-router";
import { UserRouteError } from "@/components/router/user-route-error";
import { UserRouteNotFound } from "@/components/router/user-route-not-found";

export const Route = createFileRoute("/_authenticated/@me")({
  component: Outlet,
  errorComponent: UserRouteError,
  notFoundComponent: UserRouteNotFound,
});
