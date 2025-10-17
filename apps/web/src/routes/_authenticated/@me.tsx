import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "@/components/layout/home-layout";

export const Route = createFileRoute("/_authenticated/@me")({
  component: HomeLayout,
});
