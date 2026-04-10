import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/features/home/home";
import { HomePageSkeleton } from "@/features/home/home-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/")({
  component: Home,
  pendingComponent: HomePageSkeleton,
});
