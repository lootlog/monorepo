import { createLazyFileRoute } from "@tanstack/react-router";
import { Home } from "@/features/home/home";

export const Route = createLazyFileRoute("/_authenticated/@me/")({
  component: Home,
});
