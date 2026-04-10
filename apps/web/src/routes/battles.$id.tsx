import { createFileRoute } from "@tanstack/react-router";
import { PublicBattleSkeleton } from "@/features/public-battle/public-battle-skeleton";

export const Route = createFileRoute("/battles/$id")({
  pendingComponent: PublicBattleSkeleton,
});
