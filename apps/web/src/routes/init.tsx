import { createFileRoute } from "@tanstack/react-router";
import { FullScreenLoading } from "@/components/ui/full-screen-loading";

export const Route = createFileRoute("/init")({
  pendingComponent: FullScreenLoading,
});
