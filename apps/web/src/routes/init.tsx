import { createFileRoute } from "@tanstack/react-router";
import { Init } from "@/features/init/init";

export const Route = createFileRoute("/init")({
  component: Init,
});
