import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/@me/settings/")({
  component: () => <Navigate to="/@me/settings/appearance" />,
});
