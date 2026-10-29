import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startGameClientBootstrap } from "@/lib/game-client-bootstrap";

/**
 * Starts the startup request for the signed-in tree. Called before the hooks
 * that mount the startup queries, so its effect runs ahead of their fetches.
 */
export const useGameClientBootstrap = () => {
  const queryClient = useQueryClient();

  useEffect(() => startGameClientBootstrap(queryClient), [queryClient]);
};
