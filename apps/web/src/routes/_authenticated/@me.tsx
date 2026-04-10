import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "@/components/layout/home-layout";
import { UserRouteError } from "@/components/router/user-route-error";
import { UserRouteNotFound } from "@/components/router/user-route-not-found";

export const Route = createFileRoute("/_authenticated/@me")({
  component: HomeLayout,
  errorComponent: UserRouteError,
  notFoundComponent: UserRouteNotFound,
});
