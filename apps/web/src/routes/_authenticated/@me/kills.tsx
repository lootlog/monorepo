import { createFileRoute } from "@tanstack/react-router";
import { KillsPage } from "@/features/kills/kills-page";

export const Route = createFileRoute("/_authenticated/@me/kills")({
  component: KillsPage,
});
