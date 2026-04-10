import { createFileRoute } from "@tanstack/react-router";
import { HomePageSkeleton } from "@/features/home/home-page-skeleton";

export const Route = createFileRoute("/_authenticated/@me/")({
  pendingComponent: HomePageSkeleton,
});
