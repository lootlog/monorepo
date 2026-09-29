import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { GameClientConnect } from "@/features/connect/game-client-connect";

const connectSearch = z.object({
  origin: z.string().max(255).optional().catch(undefined),
  state: z
    .string()
    .regex(/^[\w-]{16,128}$/u)
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/connect")({
  component: GameClientConnect,
  pendingComponent: FullScreenLoading,
  validateSearch: connectSearch.parse,
});
