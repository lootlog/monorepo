import { createLazyFileRoute } from "@tanstack/react-router";
import { Init } from "@/features/init/init";

export const Route = createLazyFileRoute("/init")({
  component: Init,
});
