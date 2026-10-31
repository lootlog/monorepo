import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWikiContext } from "@/contexts/wiki-context";

export const useLogout = () => {
  const { authClient } = useWikiContext();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const logout = async () => {
    if (isPending) return;

    setIsPending(true);

    try {
      await authClient.signOut();
      // Every cached response belonged to the signed-out User.
      queryClient.clear();
    } finally {
      setIsPending(false);
    }
  };

  return { logout, isPending };
};
