import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startGameClientBootstrap } from "@/lib/game-client-bootstrap";

export const useGameClientBootstrap = () => {
  const queryClient = useQueryClient();

  useEffect(() => startGameClientBootstrap(queryClient), [queryClient]);
};
