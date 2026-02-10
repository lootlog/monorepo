import { AddonsPage } from "@/features/addons/addons-page";
import { isDevMode } from "@/lib/utils/is-dev-mode";
import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/@me/addons")({
  component: () => (isDevMode ? <AddonsPage /> : <Navigate to="/@me" />),
});
