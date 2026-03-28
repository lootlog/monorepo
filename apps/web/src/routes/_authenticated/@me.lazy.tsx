import { createLazyFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "@/components/layout/home-layout";

export const Route = createLazyFileRoute("/_authenticated/@me")({
  component: HomeLayout,
});
