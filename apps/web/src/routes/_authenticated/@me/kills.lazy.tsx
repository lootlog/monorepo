import { createLazyFileRoute } from "@tanstack/react-router";
import { KillsPage } from "@/features/kills/kills-page";

export const Route = createLazyFileRoute("/_authenticated/@me/kills")({
  component: KillsPage,
});
