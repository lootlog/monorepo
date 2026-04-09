import { createLazyFileRoute } from "@tanstack/react-router";
import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { Init } from "@/features/init/init";

export const Route = createLazyFileRoute("/init")({
  pendingComponent: FullScreenLoading,
  component: Init,
});
