import { createFileRoute } from "@tanstack/react-router";
import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { Init } from "@/features/init/init";

export const Route = createFileRoute("/init")({
  component: Init,
  pendingComponent: FullScreenLoading,
});
